import { Ghost, Mail, MapPin, Phone } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import {
  snapchatLink,
  useStoreSettings,
  whatsappLink,
} from "@/lib/useStoreSettings";

export default function Contact() {
  const settings = useStoreSettings();

  return (
    <div className="bg-white">
      <section className="bg-carbon py-16 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-pink">
            Get In Touch
          </p>
          <h1 className="mb-4 font-heading text-4xl font-bold sm:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto max-w-xl text-white/70">
            Have a question about a product or order? Choose the contact method
            that works best for you, or message us on WhatsApp.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="border border-border p-6 sm:p-10">
            <h2 className="mb-6 font-heading text-2xl font-bold text-carbon">
              Contact Details
            </h2>

            <div className="space-y-4">
              {settings.email && (
                <div className="flex items-center gap-4 border border-border p-4">
                  <span className="flex h-11 w-11 items-center justify-center bg-pink/10 text-pink">
                    <Mail className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                      Email
                    </span>
                    <span className="font-semibold text-carbon">
                      {settings.email}
                    </span>
                  </span>
                </div>
              )}

              {settings.phone && (
                <div className="flex items-center gap-4 border border-border p-4">
                  <span className="flex h-11 w-11 items-center justify-center bg-pink/10 text-pink">
                    <Phone className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                      Phone
                    </span>
                    <span className="font-semibold text-carbon">
                      {settings.phone}
                    </span>
                  </span>
                </div>
              )}

              {settings.address && (
                <div className="flex items-center gap-4 border border-border p-4">
                  <span className="flex h-11 w-11 items-center justify-center bg-pink/10 text-pink">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                      Location
                    </span>
                    <span className="font-semibold text-carbon">
                      {settings.address}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <a
              href={whatsappLink(
                settings.whatsapp,
                "Hi Plugged by Ayeley, I have an enquiry."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex w-full items-center justify-center gap-3 bg-[#25D366] px-5 py-4 font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Message Us on WhatsApp
            </a>

            {settings.snapchat && (
              <div className="mt-8 border-t border-border pt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Follow Us
                </p>
                <a
                  href={snapchatLink(settings.snapchat)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-carbon transition-colors hover:text-pink"
                >
                  <Ghost className="h-4 w-4 text-pink" />
                  Snapchat {settings.snapchat.startsWith("@") ? settings.snapchat : `@${settings.snapchat}`}
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
