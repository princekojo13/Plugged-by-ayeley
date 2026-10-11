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

const STAFF_SESSION_DURATION = 2 * 60 * 60 * 1000;
const STAFF_SESSION_KEY = "plugged_staff_session_expires_at";

async function getStaffRole(user) {
  if (!user?.id) return null;

  const { data, error } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Could not verify staff access:", error);
    return null;
  }

  return data?.role === "admin" || data?.role === "assistant"
    ? data.role
    : null;
}

function getStaffExpiry() {
  const value = Number(localStorage.getItem(STAFF_SESSION_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function createStaffExpiry() {
  const expiresAt = Date.now() + STAFF_SESSION_DURATION;
  localStorage.setItem(STAFF_SESSION_KEY, String(expiresAt));
  return expiresAt;
}

function clearStaffExpiry() {
  localStorage.removeItem(STAFF_SESSION_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffRole, setStaffRole] = useState(null);
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
    clearStaffExpiry();
    if (!mountedRef.current) return;
    setUser(null);
    setSession(null);
    setStaffRole(null);
  }, [clearExpiryTimer]);

  const signOutStaff = useCallback(async () => {
    clearExpiryTimer();
    clearStaffExpiry();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Staff sign-out failed:", error);
    }
    if (mountedRef.current) {
      setUser(null);
      setSession(null);
      setStaffRole(null);
    }
  }, [clearExpiryTimer]);

  const scheduleExpiry = useCallback((expiresAt) => {
    clearExpiryTimer();
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      void signOutStaff();
      return;
    }
    expiryTimerRef.current = window.setTimeout(() => {
      void signOutStaff();
    }, remaining);
  }, [clearExpiryTimer, signOutStaff]);

  const applySession = useCallback(async (nextSession) => {
    if (!nextSession?.user) {
      clearAuthState();
      return;
    }

    const nextRole = await getStaffRole(nextSession.user);
    if (!mountedRef.current) return;

    setSession(nextSession);
    setUser(nextSession.user);
    setStaffRole(nextRole);

    if (!nextRole) {
      clearExpiryTimer();
      clearStaffExpiry();
      return;
    }

    const expiresAt = getStaffExpiry() || createStaffExpiry();
    scheduleExpiry(expiresAt);
  }, [clearAuthState, clearExpiryTimer, scheduleExpiry, signOutStaff]);

  const loginAsStaff = useCallback(async (email, password) => {
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      throw new Error("Enter your email and password.");
    }

    clearExpiryTimer();
    clearStaffExpiry();
    const expiresAt = createStaffExpiry();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data?.session?.user) {
      clearStaffExpiry();
      throw new Error("Invalid email or password.");
    }

    const authenticatedUser = data.session.user;
    const role = await getStaffRole(authenticatedUser);
    if (!role) {
      clearStaffExpiry();
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore a secondary sign-out error.
      }
      throw new Error("This account does not have store staff access.");
    }

    if (mountedRef.current) {
      setSession(data.session);
      setUser(authenticatedUser);
      setStaffRole(role);
    }
    scheduleExpiry(expiresAt);
    return { session: data.session, role };
  }, [clearExpiryTimer, scheduleExpiry]);

  const logout = useCallback(async () => {
    await signOutStaff();
  }, [signOutStaff]);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!currentSession?.user) {
          clearAuthState();
          return;
        }

        const role = await getStaffRole(currentSession.user);
        if (!mountedRef.current) return;
        setSession(currentSession);
        setUser(currentSession.user);
        setStaffRole(role);

        if (!role) {
          clearExpiryTimer();
          clearStaffExpiry();
          return;
        }

        const expiresAt = getStaffExpiry() || createStaffExpiry();
        if (Date.now() >= expiresAt) {
          await signOutStaff();
          return;
        }
        scheduleExpiry(expiresAt);
      } catch (error) {
        console.error("Authentication initialization failed:", error);
        clearAuthState();
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void initializeAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (mountedRef.current) void applySession(nextSession);
      }, 0);
    });

    return () => {
      mountedRef.current = false;
      clearExpiryTimer();
      subscription.unsubscribe();
    };
  }, [applySession, clearAuthState, clearExpiryTimer, scheduleExpiry, signOutStaff]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    staffRole,
    isAdmin: staffRole === "admin",
    isAssistant: staffRole === "assistant",
    isAuthenticated: Boolean(user),
    loginAsStaff,
    loginAsAdmin: loginAsStaff,
    logout,
    signOut: logout,
  }), [user, session, loading, staffRole, loginAsStaff, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider.");
  return context;
}
