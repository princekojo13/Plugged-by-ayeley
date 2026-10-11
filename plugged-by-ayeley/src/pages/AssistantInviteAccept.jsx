import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

function expiredMessage() {
  return "This invitation link has expired or has already been used. Ask the administrator to send a fresh invitation email, then open its newest link.";
}

export default function AssistantInviteAccept() {
  const navigate = useNavigate();
  const { user, isAssistant, loading: authLoading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(true);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function establishInviteSession() {
      const search = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const authError = search.get("error_description") || hash.get("error_description");
      const errorCode = search.get("error_code") || hash.get("error_code");
      if (authError || errorCode) {
        if (active) {
          setError(errorCode === "otp_expired" ? expiredMessage() : (authError || expiredMessage()).replaceAll("+", " "));
          setCheckingInvite(false);
        }
        return;
      }

      const tokenHash = search.get("token_hash");
      const otpType = search.get("type") || "invite";
      const code = search.get("code");
      let verificationError = null;

      if (tokenHash) {
        if (otpType !== "invite" && otpType !== "signup" && otpType !== "recovery") {
          verificationError = new Error("This is not an assistant invitation link.");
        } else {
          const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
          verificationError = result.error;
        }
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        verificationError = result.error;
      }

      if (verificationError) {
        if (active) {
          setError(expiredMessage());
          setCheckingInvite(false);
        }
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError || !data.session?.user) {
        setError(expiredMessage());
      } else if (tokenHash || code || window.location.hash) {
        setInviteVerified(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setInviteVerified(true);
      }
      setCheckingInvite(false);
    }

    void establishInviteSession().catch((inviteError) => {
      if (!active) return;
      console.error("Could not accept assistant invitation:", inviteError);
      setError(expiredMessage());
      setCheckingInvite(false);
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!checkingInvite && !authLoading && user && !isAssistant) {
      setError("This account does not have assistant access. Ask the administrator to send an invitation to the correct email.");
    }
  }, [authLoading, checkingInvite, isAssistant, user]);

  async function setNewPassword(event) {
    event.preventDefault();
    setError("");
    if (password.length < 10) {
      setError("Use at least 10 characters for the password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || "Could not set your password.");
      setSaving(false);
      return;
    }
    setSuccess(true);
    window.setTimeout(() => navigate("/assistant", { replace: true }), 800);
  }

  const waiting = checkingInvite || authLoading || (inviteVerified && !user);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><ShieldCheck className="h-7 w-7" /></span>
          <h1 className="text-2xl font-bold">Finish your assistant login</h1>
          <p className="mt-2 text-sm text-slate-400">{user?.email || "Plugged by Ayeley"}</p>
        </div>
        {waiting ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : !user ? (
          <div className="space-y-4">
            <p role="alert" className="rounded-xl bg-amber-400/10 p-4 text-sm text-amber-100">{error || expiredMessage()}</p>
            <a href="/assistant-login" className="block rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10">Go to assistant sign in</a>
          </div>
        ) : success ? <p role="status" className="rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-100">Password saved. Opening your assistant workspace…</p> : (
          <form onSubmit={setNewPassword} className="space-y-4">
            {error && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            {isAssistant && <>
              <label className="block text-sm font-medium text-slate-200">New password<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-white outline-none focus:border-white/30" /></div></label>
              <label className="block text-sm font-medium text-slate-200">Confirm password<input type="password" required minLength={10} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/30" /></label>
              <button type="submit" disabled={saving} className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black hover:bg-slate-200 disabled:opacity-50">{saving ? "Saving…" : "Set password"}</button>
            </>}
          </form>
        )}
      </section>
    </main>
  );
}
