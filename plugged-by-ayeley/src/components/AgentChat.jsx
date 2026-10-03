import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronRight,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const MAX_MESSAGE_LENGTH = 800;
const MAX_HISTORY = 8;

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Hi 👋 I’m Ayeley Store Assistant. I can help you find products, check prices and stock, explain delivery and payment, and point you to order tracking.",
};

const QUICK_ACTIONS = [
  "What products do you sell?",
  "What is your delivery fee?",
  "How can I pay?",
  "Help me find a product",
];

export default function AgentChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = async (value) => {
    const text = String(value ?? "").trim();

    if (!text || busy) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      setError(`Please keep your message under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    const userMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage].slice(-MAX_HISTORY);

    setInput("");
    setError("");
    setMessages(nextMessages);
    setBusy(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        "store-assistant",
        {
          body: { messages: nextMessages },
        },
      );

      if (functionError) {
        throw new Error(functionError.message || "The assistant could not respond.");
      }

      if (!data?.success || typeof data?.message !== "string") {
        throw new Error(data?.error || "The assistant could not respond.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      console.error("Store assistant request failed:", err);
      setError(err?.message || "The assistant is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 left-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-carbon text-white shadow-lg transition hover:scale-105"
        aria-label={open ? "Close Ayeley Store Assistant" : "Open Ayeley Store Assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {open && (
        <section
          className="fixed bottom-24 left-5 z-50 flex h-[min(650px,72vh)] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
          aria-label="Ayeley Store Assistant"
        >
          <header className="flex items-center gap-3 bg-carbon px-4 py-4 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-sm font-bold">Ayeley Store Assistant</p>
              <p className="text-[11px] text-white/60">Store help • Products • Orders</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/70">Online</span>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-london/30 p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "rounded-br-md bg-pink text-white"
                      : "rounded-bl-md border border-border bg-white text-carbon",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && !busy && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground">Try one:</p>
                <div className="grid gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => send(action)}
                      className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2 text-left text-xs hover:border-pink hover:text-pink"
                    >
                      <span>{action}</span>
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
                  Thinking…
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}
          </div>

          <div className="border-t border-border bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <Link
                to="/track-order"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-pink hover:underline"
              >
                Track an order
              </Link>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Ask about products or delivery…"
                className="min-w-0 flex-1 rounded-xl border border-border bg-london px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink"
                disabled={busy}
                aria-label="Message Ayeley Store Assistant"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink text-white disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
