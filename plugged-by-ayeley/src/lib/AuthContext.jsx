import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

const ADMIN_SESSION_DURATION = 2 * 60 * 60 * 1000;
const ADMIN_SESSION_KEY = "plugged_admin_session_expires_at";

function isAdminUser(user) {
  return user?.app_metadata?.role === "admin";
}

function getAdminExpiry() {
  const value = Number(
    localStorage.getItem(ADMIN_SESSION_KEY)
  );

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function createAdminExpiry() {
  const expiresAt =
    Date.now() + ADMIN_SESSION_DURATION;

  localStorage.setItem(
    ADMIN_SESSION_KEY,
    String(expiresAt)
  );

  return expiresAt;
}

function clearAdminExpiry() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const expiryTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current !== null) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const clearAuthState = useCallback(() => {
    clearExpiryTimer();
    clearAdminExpiry();

    if (!mountedRef.current) {
      return;
    }

    setUser(null);
    setSession(null);
    setIsAdmin(false);
  }, [clearExpiryTimer]);

  const signOutAdmin = useCallback(async () => {
    clearExpiryTimer();
    clearAdminExpiry();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(
        "Admin sign-out failed:",
        error
      );
    }

    if (mountedRef.current) {
      setUser(null);
      setSession(null);
      setIsAdmin(false);
    }
  }, [clearExpiryTimer]);

  const scheduleExpiry = useCallback(
    (expiresAt) => {
      clearExpiryTimer();

      if (!expiresAt) {
        return;
      }

      const remaining =
        expiresAt - Date.now();

      if (remaining <= 0) {
        void signOutAdmin();
        return;
      }

      expiryTimerRef.current =
        window.setTimeout(() => {
          void signOutAdmin();
        }, remaining);
    },
    [clearExpiryTimer, signOutAdmin]
  );

  const applySession = useCallback(
    (nextSession) => {
      if (!nextSession?.user) {
        clearAuthState();
        return;
      }

      const nextUser = nextSession.user;
      const admin = isAdminUser(nextUser);

      if (!mountedRef.current) {
        return;
      }

      setSession(nextSession);
      setUser(nextUser);
      setIsAdmin(admin);

      if (!admin) {
        clearExpiryTimer();
        clearAdminExpiry();
        return;
      }

      const expiresAt = getAdminExpiry();

      /*
       * An admin session without our application expiry must not
       * be treated as a valid long-lived admin UI session.
       * localStorage is only a client-side timeout helper; the real
       * authorization boundary remains Supabase Auth + RLS.
       */
      if (!expiresAt) {
        void signOutAdmin();
        return;
      }

      scheduleExpiry(expiresAt);
    },
    [
      clearAuthState,
      clearExpiryTimer,
      scheduleExpiry,
    ]
  );

  const loginAsAdmin = useCallback(
    async (password) => {
      if (
        typeof password !== "string" ||
        !password.trim()
      ) {
        throw new Error(
          "Please enter the admin password."
        );
      }

      const cleanPassword = password.trim();

      if (cleanPassword.length > 1024) {
        throw new Error(
          "Invalid admin password."
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          "admin-login",
          {
            body: {
              password: cleanPassword,
            },
          }
        );

      if (error) {
        console.error(
          "Admin login request failed:",
          error
        );

        let message =
          "Admin login failed.";

        try {
          if (
            error.context instanceof Response
          ) {
            const response =
              await error.context.json();

            if (response?.error) {
              message = response.error;
            }
          }
        } catch {
          // Keep generic error message.
        }

        throw new Error(message);
      }

      if (
        !data?.success ||
        !data?.session?.access_token ||
        !data?.session?.refresh_token
      ) {
        throw new Error(
          data?.error ||
            "Invalid admin password."
        );
      }

      /*
       * IMPORTANT:
       * Start the 2-hour timer BEFORE calling
       * setSession().
       *
       * This prevents the Supabase auth-state event
       * from seeing an admin session with no expiry
       * and logging the user out immediately.
       */
      const expiresAt = createAdminExpiry();

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.setSession({
        access_token:
          data.session.access_token,
        refresh_token:
          data.session.refresh_token,
      });

      if (
        sessionError ||
        !sessionData?.session?.user
      ) {
        clearAdminExpiry();
        clearExpiryTimer();

        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore secondary sign-out error.
        }

        throw new Error(
          "Login succeeded, but the admin session could not be established."
        );
      }

      const authenticatedUser =
        sessionData.session.user;

      if (!isAdminUser(authenticatedUser)) {
        clearAdminExpiry();
        clearExpiryTimer();

        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore secondary sign-out error.
        }

        throw new Error(
          "This account does not have administrator access."
        );
      }

      if (mountedRef.current) {
        setSession(sessionData.session);
        setUser(authenticatedUser);
        setIsAdmin(true);
      }

      scheduleExpiry(expiresAt);

      return sessionData.session;
    },
    [clearExpiryTimer, scheduleExpiry]
  );

  const logout = useCallback(async () => {
    await signOutAdmin();
  }, [signOutAdmin]);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Failed to restore Supabase session:",
            error
          );

          await supabase.auth.signOut();
          clearAuthState();

          return;
        }

        if (!currentSession?.user) {
          clearAuthState();
          return;
        }

        const currentUser =
          currentSession.user;

        const admin =
          isAdminUser(currentUser);

        if (!admin) {
          clearExpiryTimer();
          clearAdminExpiry();

          if (mountedRef.current) {
            setSession(currentSession);
            setUser(currentUser);
            setIsAdmin(false);
          }

          return;
        }

        const expiresAt =
          getAdminExpiry();

        /*
         * Existing admin session without our
         * application timer:
         *
         * Sign out rather than silently granting
         * an unlimited admin session.
         */
        if (!expiresAt) {
          await signOutAdmin();
          return;
        }

        if (Date.now() >= expiresAt) {
          await signOutAdmin();
          return;
        }

        if (mountedRef.current) {
          setSession(currentSession);
          setUser(currentUser);
          setIsAdmin(true);
        }

        scheduleExpiry(expiresAt);
      } catch (error) {
        console.error(
          "Authentication initialization failed:",
          error
        );

        clearAuthState();
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mountedRef.current) {
          return;
        }

        if (!nextSession?.user) {
          clearAuthState();
          return;
        }

        const nextUser =
          nextSession.user;

        const admin =
          isAdminUser(nextUser);

        if (!admin) {
          clearExpiryTimer();
          clearAdminExpiry();

          setSession(nextSession);
          setUser(nextUser);
          setIsAdmin(false);

          return;
        }

        /*
         * During login, the expiry is already written
         * BEFORE setSession(), so this now succeeds.
         */
        const expiresAt =
          getAdminExpiry();

        if (!expiresAt) {
          void signOutAdmin();
          return;
        }

        if (Date.now() >= expiresAt) {
          void signOutAdmin();
          return;
        }

        setSession(nextSession);
        setUser(nextUser);
        setIsAdmin(true);

        scheduleExpiry(expiresAt);
      }
    );

    return () => {
      mountedRef.current = false;

      clearExpiryTimer();
      subscription.unsubscribe();
    };
  }, [
    applySession,
    clearAuthState,
    clearExpiryTimer,
    scheduleExpiry,
    signOutAdmin,
  ]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAdmin,
      isAuthenticated: Boolean(user),
      loginAsAdmin,
      logout,
      signOut: logout,
    }),
    [
      user,
      session,
      loading,
      isAdmin,
      loginAsAdmin,
      logout,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
}