import WhatsAppIcon from "./WhatsAppIcon";
import { useStoreSettings, whatsappLink } from "@/lib/useStoreSettings";

export default function WhatsAppFloat() {
  const { whatsapp } = useStoreSettings();

  return (
    <a
      href={whatsappLink(whatsapp, "Hi Plugged by Ayeley, I have an enquiry.")}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
