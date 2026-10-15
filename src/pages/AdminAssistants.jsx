import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, MailPlus, RefreshCw, Shield, Trash2, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { toast } from "@/components/ui/use-toast";

function formatDate(value) {
  if (!value) return "Never signed in";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function errorMessage(error) {
  const explain = (message) => {
    if (/email address not authorized/i.test(message)) {
      return "Supabase's default mailer only sends to project team addresses. Configure custom SMTP in Authentication → Emails → SMTP Settings to invite other email addresses.";
    }
    if (/rate limit|too many requests/i.test(message)) {
      return "Supabase's default mailer has a low project-wide sending limit. Configure custom SMTP in Authentication → Emails → SMTP Settings to send more invitations.";
    }
    return message;
  };
  const response = error?.context;
  if (response && typeof response.json === "function") {
    try {
      const body = await response.clone().json();
      if (body?.error) {
        const friendlyMessage = explain(body.error);
        return body.diagnostic
          ? `${friendlyMessage} Details: ${body.diagnostic}`
          : friendlyMessage;
      }
    } catch {
      // Fall back to the SDK's message below.
    }
  }
  return explain(error?.message || "Assistant management is temporarily unavailable.");
}

export default function AdminAssistants() {
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const notifySuccess = (title, message) => {
    setSuccess(message);
    toast({ variant: "success", title, description: message });
  };
  const activeCount = assistants.filter((assistant) => assistant.active && !assistant.invited).length;
  const pendingCount = assistants.filter((assistant) => assistant.invited).length;

  const loadAssistants = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("admin-assistants", { method: "GET" });
      if (invokeError) setError(await errorMessage(invokeError));
      else setAssistants(Array.isArray(data?.assistants) ? data.assistants : []);
    } catch (loadError) {
      setError(await errorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadAssistants(); }, [loadAssistants]);

  async function inviteAssistant(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("admin-assistants", {
        method: "POST",
        body: { name: name.trim(), email: email.trim() },
      });
      if (invokeError) {
        setError(await errorMessage(invokeError));
        return;
      }
      if (data?.invited || data?.enabledExisting || data?.alreadyAssistant || data?.passwordResetSent) {
        notifySuccess(data.passwordResetSent ? "Password link sent" : "Assistant invitation updated", data.passwordResetSent
          ? `A password setup email was sent to ${data.email}. They should open the newest email link to choose their password.`
          : data.resent
            ? `A fresh invitation was sent to ${data.email}. They should open the newest email link to set their password.`
            : data.alreadyAssistant
              ? `${data.email} already has assistant access.`
              : data.enabledExisting
                ? `${data.email} already had an account. Assistant access is enabled; they can sign in with their existing password.`
                : `Invitation sent to ${data.email}. They can set a password from the email link.`);
        setName("");
        setEmail("");
        await loadAssistants(true);
      } else {
        setError(data?.error || "The invitation could not be sent.");
      }
    } catch (inviteError) {
      setError(await errorMessage(inviteError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssistant(assistant) {
    const confirmed = window.confirm(
      `Permanently delete the assistant account for ${assistant.email}? They will lose access to the admin workspace.`
    );
    if (!confirmed) return;

    setDeletingId(assistant.id);
    setError("");
    setSuccess("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("admin-assistants", {
        method: "DELETE",
        body: { userId: assistant.id },
      });
      if (invokeError) {
        setError(await errorMessage(invokeError));
        return;
      }
      if (!data?.deleted) {
        setError(data?.error || "The assistant account could not be deleted.");
        return;
      }

      setAssistants((current) => current.filter((item) => item.id !== assistant.id));
      notifySuccess("Assistant deleted", `Assistant account for ${assistant.email} was deleted.`);
    } catch (deleteError) {
      setError(await errorMessage(deleteError));
    } finally {
      setDeletingId("");
    }
  }

  async function sendPasswordSetupLink(assistant) {
    setResettingId(assistant.id);
    setError("");
    setSuccess("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("admin-assistants", {
        method: "POST",
        body: { name: assistant.name || "Assistant", email: assistant.email },
      });
      if (invokeError) {
        setError(await errorMessage(invokeError));
        return;
      }
      if (data?.passwordResetSent) {
        notifySuccess("Password reset link sent", `A password reset link was sent to ${assistant.email}. They can choose a new password from the email.`);
      } else if (data?.invited || data?.resent) {
        notifySuccess("Invitation sent", `A fresh invitation link was sent to ${assistant.email}. They can set their password from the email.`);
      } else {
        setError(data?.error || "The password setup link could not be sent.");
      }
    } catch (resetError) {
      setError(await errorMessage(resetError));
    } finally {
      setResettingId("");
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      <AdminPageHeader
        title="Assistants"
        description="Invite staff, manage account access, and check sign-in activity."
        actions={<button type="button" onClick={() => void loadAssistants(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#c20f4d]/40 hover:bg-[#fff7fa] hover:text-[#b10b46] disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>}
      />

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-7 sm:px-8 sm:py-9">
        {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}
        {success && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">{success}</div>}

        <div className="grid gap-3 sm:grid-cols-3">
          <AssistantMetric label="All staff" value={loading ? "…" : assistants.length} detail="Assistant accounts" />
          <AssistantMetric label="Active" value={loading ? "…" : activeCount} detail="Can access the workspace" />
          <AssistantMetric label="Invitations" value={loading ? "…" : pendingCount} detail="Waiting for account setup" />
        </div>

        <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0f6] text-[#b10b46]"><MailPlus className="h-5 w-5" /></span>
            <div><h2 className="font-heading text-xl font-bold">Create an assistant login</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-black/50">Invite staff by email. They choose their own password; assistants can view orders and update delivery status only.</p></div>
          </div>
          <form onSubmit={inviteAssistant} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="block text-sm font-medium text-black/70">Assistant name<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="admin-input mt-2 w-full" /></label>
            <label className="block text-sm font-medium text-black/70">Email address<input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="admin-input mt-2 w-full" /></label>
            <button type="submit" disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ff1f8f] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e60078] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}{saving ? "Sending…" : "Send invitation"}</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-6 py-5">
            <div><h2 className="font-heading text-xl font-bold">Staff accounts</h2><p className="mt-1 text-sm text-black/45">Last sign-in time comes from Supabase Auth.</p></div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fff0f7] px-3 py-1.5 text-xs font-semibold text-[#e60078]"><Users className="h-3.5 w-3.5" />{assistants.length} {assistants.length === 1 ? "assistant" : "assistants"}</span>
          </div>
          {loading ? <div className="flex min-h-[220px] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-[#ff1f8f]" /></div> : assistants.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left text-sm">
              <thead className="bg-[#f8f5f6] text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">
                <tr>
                  <th scope="col" className="px-4 py-3">Assistant</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Added</th>
                  <th scope="col" className="px-4 py-3">Last sign-in</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {assistants.map((assistant) => <tr key={assistant.id} className="align-middle transition hover:bg-[#fffafd]">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8edf1] text-xs font-bold uppercase text-[#9e1746]">{(assistant.name || assistant.email || "A").slice(0, 1)}</span>
                      <span className="font-semibold">{assistant.name || "Assistant"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-black/60">{assistant.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-black/55">{formatDate(assistant.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-black/55">{formatDate(assistant.last_sign_in_at)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${assistant.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><Shield className="h-3.5 w-3.5" />{assistant.invited ? "Invitation pending" : assistant.active ? "Active" : "Inactive"}</span></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => void sendPasswordSetupLink(assistant)} disabled={Boolean(deletingId || resettingId)} aria-label={`${assistant.invited ? "Resend invitation" : "Send password reset link"} to ${assistant.email}`} title={assistant.invited ? "Resend invitation" : "Send password reset link"} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-black/10 px-2.5 text-black/70 transition hover:border-[#ff1f8f] hover:text-[#e60078] disabled:cursor-not-allowed disabled:opacity-50">
                        {resettingId === assistant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        <span className="text-xs font-semibold">{resettingId === assistant.id ? "Sending…" : assistant.invited ? "Resend invite" : "Reset password"}</span>
                      </button>
                      <button type="button" onClick={() => void deleteAssistant(assistant)} disabled={Boolean(deletingId || resettingId)} aria-label={`Delete assistant account for ${assistant.email}`} title="Delete assistant account" className="inline-flex h-9 min-w-9 items-center justify-center gap-2 rounded-lg border border-red-200 px-2.5 text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{deletingId === assistant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}<span className="text-xs font-semibold">{deletingId === assistant.id ? "Deleting…" : "Delete"}</span></button>
                    </div>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div> : <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f7] text-[#ff1f8f]"><Users className="h-6 w-6" /></div><h3 className="mt-5 font-heading text-xl font-bold">No assistant accounts yet</h3><p className="mt-2 max-w-sm text-sm leading-6 text-black/40">Invited staff accounts will appear here so you can review their access and sign-in activity.</p></div>}
        </section>
      </main>
    </div>
  );
}

function AssistantMetric({ label, value, detail }) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-black/45">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="font-heading text-3xl font-bold leading-none text-[#1b1518]">{value}</span>
        <span className="text-right text-xs text-black/40">{detail}</span>
      </div>
    </section>
  );
}
