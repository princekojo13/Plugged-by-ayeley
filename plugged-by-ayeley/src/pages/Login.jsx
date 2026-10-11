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
    isAssistant,
    loading,
    loginAsStaff,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && isAuthenticated && isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  if (!loading && isAuthenticated && isAssistant) {
    return <Navigate to="/assistant" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { role } = await loginAsStaff(email, password);

      const destination = role === "assistant"
        ? "/assistant"
        : location.state?.from || "/admin";

      navigate(destination, {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.message || "Invalid email or password."
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
            Staff Portal
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Plugged by Ayeley
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Staff sign in
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Sign in with the email invitation from your store administrator.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="staff-email"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Email
              </label>

              <input
                id="staff-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                disabled={submitting}
                maxLength={254}
                required
                className="mb-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-white/30"
              />

              <label
                htmlFor="staff-password"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                id="staff-password"
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
                  placeholder="Enter your password"
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
                : "Sign in"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-5 text-center text-xs text-slate-500">
            Staff sessions automatically expire after
            2 hours.
          </div>
        </div>
      </div>
    </div>
  );
}
