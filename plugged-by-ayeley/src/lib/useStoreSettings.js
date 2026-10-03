import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { SITE_CONFIG } from "@/lib/siteConfig";

// Fallbacks used until the store_settings row loads, or when a field
// has been left blank in Admin → Settings.
const DEFAULT_SETTINGS = {
  brand_name: SITE_CONFIG.brandName,
  tagline:
    "Original UK-sourced products delivered across Ghana. Stay Plugged In.",
  email: SITE_CONFIG.email,
  phone: SITE_CONFIG.phone,
  whatsapp: SITE_CONFIG.whatsappDisplay,
  domain: "",
  snapchat: SITE_CONFIG.snapchat,
  instagram: "",
  facebook: "",
  tiktok: "",
};

async function fetchStoreSettings() {
  const { data, error } = await supabase
    .from("store_settings")
    .select(
      "brand_name,tagline,email,phone,whatsapp,domain,snapchat,instagram,facebook,tiktok"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load store settings:", error);
    return null;
  }

  return data;
}

/*
 * Shared, cached store settings (contact details, socials, branding).
 * Every customer-facing page reads contact info from here so the owner
 * only has to update it once in Admin → Settings.
 */
export function useStoreSettings() {
  const { data } = useQuery({
    queryKey: ["store_settings"],
    queryFn: fetchStoreSettings,
    staleTime: 5 * 60 * 1000,
  });

  const settings = { ...DEFAULT_SETTINGS };

  for (const [key, value] of Object.entries(data || {})) {
    if (typeof value === "string" && value.trim()) {
      settings[key] = value.trim();
    }
  }

  return settings;
}

export function whatsappLink(number, message) {
  const digits = String(number || "").replace(/[^0-9]/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function snapchatLink(handle) {
  if (handle.startsWith("http")) return handle;
  return `https://www.snapchat.com/add/${handle.replace("@", "")}`;
}
