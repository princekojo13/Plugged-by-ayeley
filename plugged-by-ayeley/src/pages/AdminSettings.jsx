import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  Save,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_SETTINGS = {
  id: 1,

  brand_name: "Plugged by Ayeley",
  tagline: "",
  email: "",
  phone: "",
  whatsapp: "",
  domain: "",
  snapchat: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  address: "",

  store_open: true,
  maintenance_mode: false,

  pay_online_enabled: true,
  pay_on_delivery_enabled: true,
  pay_on_delivery_accra_only: true,

  delivery_fee_amount: 10,
  delivery_distance_km: 7,
  minimum_delivery_fee: 10,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("store_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);

      setError(
        err?.message || "Could not load store settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  }

  async function saveSettings(event) {
    event.preventDefault();

    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const payload = {
        id: 1,

        brand_name:
          settings.brand_name?.trim() || null,

        tagline:
          settings.tagline?.trim() || null,

        email:
          settings.email?.trim() || null,

        phone:
          settings.phone?.trim() || null,

        whatsapp:
          settings.whatsapp?.trim() || null,

        domain:
          settings.domain?.trim() || null,

        snapchat:
          settings.snapchat?.trim() || null,

        instagram:
          settings.instagram?.trim() || null,

        facebook:
          settings.facebook?.trim() || null,

        tiktok:
          settings.tiktok?.trim() || null,

        address:
          settings.address?.trim() || null,

        store_open:
          Boolean(settings.store_open),

        maintenance_mode:
          Boolean(settings.maintenance_mode),

        pay_online_enabled:
          Boolean(settings.pay_online_enabled),

        pay_on_delivery_enabled:
          Boolean(settings.pay_on_delivery_enabled),

        pay_on_delivery_accra_only:
          Boolean(settings.pay_on_delivery_accra_only),

        delivery_fee_amount:
          Number(settings.delivery_fee_amount) || 10,

        delivery_distance_km:
          Number(settings.delivery_distance_km) || 7,

        minimum_delivery_fee:
          Number(settings.minimum_delivery_fee) || 10,

        updated_at: new Date().toISOString(),
      };

      const { data, error: saveError } = await supabase
        .from("store_settings")
        .upsert(payload, {
          onConflict: "id",
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      if (!data) {
        throw new Error(
          "Supabase did not return the saved settings."
        );
      }

      setSettings({
        ...DEFAULT_SETTINGS,
        ...data,
      });

      setSuccess("Settings saved successfully.");

      window.setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (err) {
      console.error("SETTINGS SAVE ERROR:", err);

      setError(
        err?.message ||
          err?.details ||
          err?.hint ||
          "Could not save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff1f8f]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white transition hover:border-[#ff1f8f] hover:text-[#ff1f8f]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff1f8f]">
                Plugged by Ayeley
              </p>

              <h1 className="font-heading text-2xl font-bold">
                Store Settings
              </h1>

              <p className="text-sm text-black/45">
                Control your store information and checkout settings.
              </p>
            </div>
          </div>

          <Settings className="h-6 w-6 text-[#ff1f8f]" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-4 w-4" />
            </div>

            <div>
              <p className="font-semibold">
                Saved
              </p>

              <p>{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <p className="font-semibold">
              Save failed
            </p>

            <p className="mt-1 break-words">
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={saveSettings}
          className="space-y-6"
        >
          <SettingsSection
            title="Store Information"
            description="Basic information customers see."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Brand Name"
                value={settings.brand_name}
                onChange={(value) =>
                  updateField("brand_name", value)
                }
              />

              <Field
                label="Tagline"
                value={settings.tagline}
                onChange={(value) =>
                  updateField("tagline", value)
                }
              />

              <Field
                label="Email"
                type="email"
                value={settings.email}
                onChange={(value) =>
                  updateField("email", value)
                }
              />

              <Field
                label="Phone"
                value={settings.phone}
                onChange={(value) =>
                  updateField("phone", value)
                }
              />

              <Field
                label="WhatsApp"
                value={settings.whatsapp}
                onChange={(value) =>
                  updateField("whatsapp", value)
                }
              />

              <Field
                label="Domain"
                value={settings.domain}
                onChange={(value) =>
                  updateField("domain", value)
                }
              />

              <div className="md:col-span-2">
                <Field
                  label="Business Address"
                  value={settings.address}
                  onChange={(value) =>
                    updateField("address", value)
                  }
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Social Media"
            description="Your public social media links."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Instagram"
                value={settings.instagram}
                onChange={(value) =>
                  updateField("instagram", value)
                }
              />

              <Field
                label="Facebook"
                value={settings.facebook}
                onChange={(value) =>
                  updateField("facebook", value)
                }
              />

              <Field
                label="TikTok"
                value={settings.tiktok}
                onChange={(value) =>
                  updateField("tiktok", value)
                }
              />

              <Field
                label="Snapchat"
                value={settings.snapchat}
                onChange={(value) =>
                  updateField("snapchat", value)
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Payments"
            description="Choose which checkout payment methods are available."
          >
            <div className="space-y-4">
              <Toggle
                label="Pay Online"
                description="Allow customers to pay online."
                checked={
                  settings.pay_online_enabled
                }
                onChange={(value) =>
                  updateField(
                    "pay_online_enabled",
                    value
                  )
                }
              />

              <Toggle
                label="Pay on Delivery"
                description="Allow customers to pay when their order arrives."
                checked={
                  settings.pay_on_delivery_enabled
                }
                onChange={(value) =>
                  updateField(
                    "pay_on_delivery_enabled",
                    value
                  )
                }
              />

              <Toggle
                label="Pay on Delivery — Accra Only"
                description="Restrict Pay on Delivery to Greater Accra."
                checked={
                  settings.pay_on_delivery_accra_only
                }
                onChange={(value) =>
                  updateField(
                    "pay_on_delivery_accra_only",
                    value
                  )
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Delivery"
            description="Your distance-based delivery pricing."
          >
            <div className="grid gap-5 md:grid-cols-3">
              <NumberField
                label="Fee per Distance (GHS)"
                value={
                  settings.delivery_fee_amount
                }
                onChange={(value) =>
                  updateField(
                    "delivery_fee_amount",
                    value
                  )
                }
              />

              <NumberField
                label="Every Kilometres"
                value={
                  settings.delivery_distance_km
                }
                onChange={(value) =>
                  updateField(
                    "delivery_distance_km",
                    value
                  )
                }
              />

              <NumberField
                label="Minimum Delivery Fee (GHS)"
                value={
                  settings.minimum_delivery_fee
                }
                onChange={(value) =>
                  updateField(
                    "minimum_delivery_fee",
                    value
                  )
                }
              />
            </div>

            <div className="mt-5 rounded-xl bg-[#fff0f7] p-4 text-sm text-black/60">
              <span className="font-semibold text-[#e60078]">
                Current rule:
              </span>{" "}
              GH₵
              {settings.delivery_fee_amount ||
                10}{" "}
              every{" "}
              {settings.delivery_distance_km ||
                7}{" "}
              km, with a minimum delivery fee of GH₵
              {settings.minimum_delivery_fee ||
                10}.
            </div>
          </SettingsSection>

          <SettingsSection
            title="Store Status"
            description="Control whether the store is operating."
          >
            <div className="space-y-4">
              <Toggle
                label="Store Open"
                description="Allow customers to place orders."
                checked={settings.store_open}
                onChange={(value) =>
                  updateField(
                    "store_open",
                    value
                  )
                }
              />

              <Toggle
                label="Maintenance Mode"
                description="Temporarily disable normal shopping."
                checked={
                  settings.maintenance_mode
                }
                onChange={(value) =>
                  updateField(
                    "maintenance_mode",
                    value
                  )
                }
              />
            </div>
          </SettingsSection>

          <div className="sticky bottom-4 z-20 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#ff1f8f] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-[#e60078] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-bold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-black/45">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">
        {label}
      </span>

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff1f8f] focus:ring-2 focus:ring-[#ff1f8f]/10"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">
        {label}
      </span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ff1f8f] focus:ring-2 focus:ring-[#ff1f8f]/10"
      />
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-black/[0.07] p-4 transition hover:bg-[#fff8fc]">
      <div>
        <p className="text-sm font-semibold">
          {label}
        </p>

        <p className="mt-1 text-xs text-black/45">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-5 w-5 accent-[#ff1f8f]"
      />
    </label>
  );
}