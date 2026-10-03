import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function MessageCard({
  message,
  type,
  onDelete,
  deleting,
}) {
  const [expanded, setExpanded] = useState(false);
  const isWholesale = type === "wholesale";

  const title = isWholesale
    ? message.business_name
    : message.name;

  const subtitle = isWholesale
    ? message.contact_name
    : message.email;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.07] bg-white shadow-sm">
      <button
        type="button"
        onClick={() =>
          setExpanded((value) => !value)
        }
        className="w-full px-5 py-5 text-left transition hover:bg-[#fff8fc] sm:px-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isWholesale
                    ? "bg-purple-50 text-purple-700"
                    : "bg-[#fff0f7] text-[#e60078]"
                }`}
              >
                {isWholesale
                  ? "Wholesale"
                  : "Contact"}
              </span>

              <span className="text-xs text-black/35">
                {formatDate(message.created_at)}
              </span>
            </div>

            <h2 className="mt-3 truncate font-semibold text-black">
              {title || "Unknown sender"}
            </h2>

            <p className="mt-1 truncate text-sm text-black/45">
              {subtitle || "No contact details"}
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff0f7] text-[#ff1f8f]">
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-black/[0.06] px-5 py-5 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
                Name
              </p>

              <p className="mt-1 text-sm font-medium">
                {isWholesale
                  ? message.contact_name || "—"
                  : message.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
                Email
              </p>

              {message.email ? (
                <a
                  href={`mailto:${message.email}`}
                  className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-[#e60078] hover:text-black"
                >
                  <Mail className="h-4 w-4" />
                  {message.email}
                </a>
              ) : (
                <p className="mt-1 text-sm text-black/45">
                  —
                </p>
              )}
            </div>

            {message.phone && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
                  Phone
                </p>

                <a
                  href={`tel:${message.phone}`}
                  className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-[#e60078] hover:text-black"
                >
                  <Phone className="h-4 w-4" />
                  {message.phone}
                </a>
              </div>
            )}

            {isWholesale && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
                  Business
                </p>

                <p className="mt-1 text-sm font-medium">
                  {message.business_name || "—"}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
              Message
            </p>

            <div className="mt-2 rounded-2xl border border-black/[0.06] bg-[#fafafa] p-4 text-sm leading-7 text-black/65">
              {message.message || "No message provided."}
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() =>
                onDelete(message, type)
              }
              disabled={deleting === message.id}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
            >
              {deleting === message.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}

              Delete Message
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminMessages() {
  const [contactMessages, setContactMessages] =
    useState([]);

  const [wholesaleMessages, setWholesaleMessages] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [error, setError] = useState("");

  const loadMessages = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          contactResult,
          wholesaleResult,
        ] = await Promise.all([
          supabase
            .from("contact_messages")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("wholesale_inquiries")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),
        ]);

        if (contactResult.error) {
          throw contactResult.error;
        }

        if (wholesaleResult.error) {
          throw wholesaleResult.error;
        }

        setContactMessages(
          contactResult.data || []
        );

        setWholesaleMessages(
          wholesaleResult.data || []
        );
      } catch (err) {
        console.error(
          "Failed to load messages:",
          err
        );

        setError(
          err?.message ||
            "Could not load messages."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const deleteMessage = async (
    message,
    type
  ) => {
    const confirmed = window.confirm(
      "Delete this message permanently?"
    );

    if (!confirmed) return;

    setDeleting(message.id);
    setError("");

    try {
      const table =
        type === "wholesale"
          ? "wholesale_inquiries"
          : "contact_messages";

      const { error: deleteError } =
        await supabase
          .from(table)
          .delete()
          .eq("id", message.id);

      if (deleteError) {
        throw deleteError;
      }

      if (type === "wholesale") {
        setWholesaleMessages((current) =>
          current.filter(
            (item) => item.id !== message.id
          )
        );
      } else {
        setContactMessages((current) =>
          current.filter(
            (item) => item.id !== message.id
          )
        );
      }
    } catch (err) {
      console.error(
        "Failed to delete message:",
        err
      );

      setError(
        err?.message ||
          "Could not delete message."
      );
    } finally {
      setDeleting(null);
    }
  };

  const filteredContacts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return contactMessages;

    return contactMessages.filter((message) =>
      [
        message.name,
        message.email,
        message.phone,
        message.message,
      ]
        .filter(Boolean)
        .some((field) =>
          field.toLowerCase().includes(value)
        )
    );
  }, [contactMessages, search]);

  const filteredWholesale = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return wholesaleMessages;

    return wholesaleMessages.filter((message) =>
      [
        message.business_name,
        message.contact_name,
        message.email,
        message.phone,
        message.message,
      ]
        .filter(Boolean)
        .some((field) =>
          field.toLowerCase().includes(value)
        )
    );
  }, [wholesaleMessages, search]);

  const total =
    contactMessages.length +
    wholesaleMessages.length;

  const visibleContacts =
    tab === "all" || tab === "contact";

  const visibleWholesale =
    tab === "all" || tab === "wholesale";

  const hasResults =
    (visibleContacts &&
      filteredContacts.length > 0) ||
    (visibleWholesale &&
      filteredWholesale.length > 0);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:border-[#ff1f8f] hover:text-[#ff1f8f]"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff1f8f]">
                  Admin
                </p>

                <h1 className="mt-1 font-heading text-2xl font-bold">
                  Messages
                </h1>

                <p className="mt-1 text-sm text-black/45">
                  Customer and wholesale enquiries.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadMessages(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[#ff1f8f] hover:text-[#ff1f8f] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <p className="font-semibold">
              Something went wrong
            </p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="All Messages"
            value={total}
          />

          <Stat
            label="Contact"
            value={contactMessages.length}
          />

          <Stat
            label="Wholesale"
            value={wholesaleMessages.length}
          />
        </div>

        {/* Search + tabs */}
        <div className="mt-6 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search messages..."
                className="w-full rounded-xl border border-black/10 bg-[#fafafa] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#ff1f8f] focus:bg-white"
              />
            </div>

            <div className="flex rounded-xl bg-[#f5f5f6] p-1">
              {[
                ["all", "All"],
                ["contact", "Contact"],
                ["wholesale", "Wholesale"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    tab === value
                      ? "bg-[#ff1f8f] text-white shadow-sm"
                      : "text-black/45 hover:text-black"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-black/[0.06] pt-4 text-sm text-black/40">
            {hasResults
              ? "Click a message to view the full enquiry."
              : "No matching messages."}
          </div>
        </div>

        {/* Messages */}
        <div className="mt-6">
          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-black/[0.07] bg-white">
              <RefreshCw className="h-8 w-8 animate-spin text-[#ff1f8f]" />
            </div>
          ) : !hasResults ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-black/[0.07] bg-white px-6 text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0f7] text-[#ff1f8f]">
                <Mail className="h-6 w-6" />
              </div>

              <h2 className="mt-5 font-heading text-xl font-bold">
                No messages found
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-black/40">
                Customer enquiries will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleContacts &&
                filteredContacts.map(
                  (message) => (
                    <MessageCard
                      key={`contact-${message.id}`}
                      message={message}
                      type="contact"
                      onDelete={deleteMessage}
                      deleting={deleting}
                    />
                  )
                )}

              {visibleWholesale &&
                filteredWholesale.map(
                  (message) => (
                    <MessageCard
                      key={`wholesale-${message.id}`}
                      message={message}
                      type="wholesale"
                      onDelete={deleteMessage}
                      deleting={deleting}
                    />
                  )
                )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

      <div className="mt-3 h-1 w-10 rounded-full bg-[#ff1f8f]" />
    </div>
  );
}