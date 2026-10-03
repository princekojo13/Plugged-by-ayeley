import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isAuthenticated,
    isAdmin,
    loading,
    loginAsAdmin,
  } = useAuth();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError("Enter the admin password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await loginAsAdmin(cleanPassword);

      const destination =
        location.state?.from || "/admin";

      navigate(destination, {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.message || "Invalid admin password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Admin Portal
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Plugged by Ayeley
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Administrator sign in
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              This area is private and restricted to the
              store administrator.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Admin password
              </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  id="admin-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  disabled={submitting}
                  maxLength={1024}
                  spellCheck={false}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-12 text-white outline-none placeholder:text-slate-600 focus:border-white/30"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  disabled={submitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white disabled:opacity-50"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Signing in..."
                : "Enter Admin Panel"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-5 text-center text-xs text-slate-500">
            Admin sessions automatically expire after
            2 hours.
          </div>
        </div>
      </div>
    </div>
  );
}