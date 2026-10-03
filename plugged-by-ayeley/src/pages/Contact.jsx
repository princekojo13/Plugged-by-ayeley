import { useState } from "react";
import {
  Ghost,
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import {
  snapchatLink,
  useStoreSettings,
  whatsappLink,
} from "@/lib/useStoreSettings";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 30;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

export default function Contact() {
  const settings = useStoreSettings();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  };

  const validate = () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();

    if (name.length < 2) {
      return "Please enter your name.";
    }

    if (name.length > MAX_NAME_LENGTH) {
      return "Your name is too long.";
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      return "Please enter a valid email address.";
    }

    if (phone.length > MAX_PHONE_LENGTH) {
      return "Please enter a valid phone number.";
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
      return "Your subject is too long.";
    }

    if (message.length < 3) {
      return "Please enter your message.";
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return "Your message is too long.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const name = form.name.trim();
      const email = form.email.trim();
      const phone = form.phone.trim();
      const subject = form.subject.trim();
      const message = form.message.trim();

      /*
       * contact_messages currently stores:
       * - name
       * - email
       * - phone
       * - message
       *
       * The table does not currently have a subject column,
       * so the subject is safely included in the saved message.
       */
      const completeMessage = [
        subject
          ? `Subject: ${subject}`
          : "",
        message,
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data, error: functionError } =
        await supabase.functions.invoke(
          "create-contact",
          {
            body: {
              name,
              email: email || null,
              phone: phone || null,
              message: completeMessage,
            },
          }
        );

      if (functionError) {
        throw new Error(
          functionError.message ||
            "We could not send your message."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            "We could not send your message."
        );
      }

      setSent(true);

      setForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      console.error(
        "Contact submission failed:",
        err
      );

      setError(
        err?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-carbon py-16 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-pink">
            Get In Touch
          </p>

          <h1 className="mb-4 font-heading text-4xl font-bold sm:text-5xl">
            Contact Us
          </h1>

          <p className="mx-auto max-w-xl text-white/70">
            Have a question about our products or your
            order? We're here to help. Reach out and we'll
            get back to you as soon as possible.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Contact information */}
            <div>
              <h2 className="mb-6 font-heading text-2xl font-bold text-carbon">
                Contact Details
              </h2>

              <div className="space-y-5">
                <a
                  href={whatsappLink(
                    settings.whatsapp,
                    "Hi Plugged by Ayeley, I have an enquiry."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 border border-border p-4 transition-colors hover:border-pink"
                >
                  <div className="flex h-12 w-12 items-center justify-center bg-pink/10 transition-colors group-hover:bg-pink">
                    <WhatsAppIcon className="h-6 w-6 text-pink transition-colors group-hover:text-white" />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      WhatsApp — fastest reply
                    </p>

                    <p className="font-semibold text-carbon">
                      {settings.whatsapp}
                    </p>
                  </div>
                </a>

                {settings.email && (
                  <a
                    href={`mailto:${settings.email}`}
                    className="group flex items-center gap-4 border border-border p-4 transition-colors hover:border-pink"
                  >
                    <div className="flex h-12 w-12 items-center justify-center bg-pink/10 transition-colors group-hover:bg-pink">
                      <Mail className="h-6 w-6 text-pink transition-colors group-hover:text-white" />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Email
                      </p>

                      <p className="font-semibold text-carbon">
                        {settings.email}
                      </p>
                    </div>
                  </a>
                )}

                {settings.phone && (
                  <a
                    href={`tel:${settings.phone}`}
                    className="group flex items-center gap-4 border border-border p-4 transition-colors hover:border-pink"
                  >
                    <div className="flex h-12 w-12 items-center justify-center bg-pink/10 transition-colors group-hover:bg-pink">
                      <Phone className="h-6 w-6 text-pink transition-colors group-hover:text-white" />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Phone
                      </p>

                      <p className="font-semibold text-carbon">
                        {settings.phone}
                      </p>
                    </div>
                  </a>
                )}

                <div className="flex items-center gap-4 border border-border p-4">
                  <div className="flex h-12 w-12 items-center justify-center bg-pink/10">
                    <MapPin className="h-6 w-6 text-pink" />
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Location
                    </p>

                    <p className="font-semibold text-carbon">
                      Mission House, G.E.C, North-LA
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Ghana
                    </p>
                  </div>
                </div>
              </div>

              {/* Social */}
              {settings.snapchat && (
                <div className="mt-8">
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-carbon">
                    Follow Us
                  </h3>

                  <a
                    href={snapchatLink(settings.snapchat)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-pink hover:text-pink"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink/10 text-pink">
                      <Ghost className="h-4 w-4" />
                    </span>
                    Snapchat{" "}
                    {settings.snapchat.startsWith("@")
                      ? settings.snapchat
                      : `@${settings.snapchat}`}
                  </a>
                </div>
              )}
            </div>

            {/* Form */}
            <div>
              {sent ? (
                <div className="border border-green-200 bg-green-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <Send className="h-8 w-8 text-green-600" />
                  </div>

                  <h3 className="mb-2 font-heading text-xl font-bold text-carbon">
                    Message Sent!
                  </h3>

                  <p className="mb-6 text-sm text-muted-foreground">
                    Thank you for reaching out. We'll get
                    back to you shortly.
                  </p>

                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="text-sm font-semibold text-pink transition-colors hover:text-carbon"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <h2 className="mb-2 font-heading text-2xl font-bold text-carbon">
                    Send a Message
                  </h2>

                  <p className="mb-4 text-sm text-muted-foreground">
                    Fill out the form below and we'll
                    respond as soon as we can.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-carbon">
                        Name *
                      </label>

                      <input
                        value={form.name}
                        onChange={(event) =>
                          setField(
                            "name",
                            event.target.value
                          )
                        }
                        maxLength={MAX_NAME_LENGTH}
                        autoComplete="name"
                        required
                        className="ck-input"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-carbon">
                        Phone
                      </label>

                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(event) =>
                          setField(
                            "phone",
                            event.target.value
                          )
                        }
                        maxLength={MAX_PHONE_LENGTH}
                        autoComplete="tel"
                        className="ck-input"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-carbon">
                        Email
                      </label>

                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setField(
                            "email",
                            event.target.value
                          )
                        }
                        maxLength={MAX_EMAIL_LENGTH}
                        autoComplete="email"
                        className="ck-input"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-carbon">
                        Subject
                      </label>

                      <input
                        value={form.subject}
                        onChange={(event) =>
                          setField(
                            "subject",
                            event.target.value
                          )
                        }
                        maxLength={MAX_SUBJECT_LENGTH}
                        className="ck-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-carbon">
                      Message *
                    </label>

                    <textarea
                      value={form.message}
                      onChange={(event) =>
                        setField(
                          "message",
                          event.target.value
                        )
                      }
                      required
                      rows={5}
                      maxLength={MAX_MESSAGE_LENGTH}
                      className="ck-input"
                    />

                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {form.message.length}/
                      {MAX_MESSAGE_LENGTH}
                    </p>
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="text-sm text-red-600"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 bg-pink py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-carbon disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}