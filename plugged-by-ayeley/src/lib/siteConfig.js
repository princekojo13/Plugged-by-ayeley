// Central site configuration — easy for the business owner to update

// Single source of truth for Ghana regions: delivery time + fee.
// Used by both the Delivery page display and the checkout fee calculation
// so the timelines shown to customers always match the fees they are charged.
export const REGIONS = [
  { name: "Greater Accra", city: "Accra", delivery: "1–2 days", fee: 20 },
  { name: "Ashanti", city: "Kumasi", delivery: "2–3 days", fee: 30 },
  { name: "Central", city: "Cape Coast", delivery: "2–3 days", fee: 30 },
  { name: "Eastern", city: "Koforidua", delivery: "2–3 days", fee: 30 },
  { name: "Western", city: "Takoradi", delivery: "3–4 days", fee: 35 },
  { name: "Western North", city: "Sefwi Wiawso", delivery: "3–4 days", fee: 40 },
  { name: "Volta", city: "Ho", delivery: "3–4 days", fee: 40 },
  { name: "Oti", city: "Dambai", delivery: "3–4 days", fee: 40 },
  { name: "Bono", city: "Sunyani", delivery: "3–5 days", fee: 45 },
  { name: "Bono East", city: "Techiman", delivery: "3–5 days", fee: 45 },
  { name: "Ahafo", city: "Goaso", delivery: "3–5 days", fee: 45 },
  { name: "Northern", city: "Tamale", delivery: "4–6 days", fee: 60 },
  { name: "Upper East", city: "Bolgatanga", delivery: "5–7 days", fee: 70 },
  { name: "Upper West", city: "Wa", delivery: "5–7 days", fee: 70 },
  { name: "Savannah", city: "Damongo", delivery: "5–7 days", fee: 70 },
  { name: "North East", city: "Nalerigu", delivery: "5–7 days", fee: 70 },
];

export const ghanaRegions = REGIONS.map((r) => r.name);

// Our dispatch hub in Accra — used for distance-based delivery fees and tracking maps
export const ACCRA_HUB = [5.6037, -0.1870];

// Haversine distance in km between two [lat, lng] points
export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Delivery fee: 10 GHS for every 7 km (ratio 7km:10cedi), minimum 10 GHS
export function deliveryFeeFromDistance(km) {
  return Math.max(10, Math.ceil(km / 7) * 10);
}

export const SITE_CONFIG = {
  brandName: "Plugged by Ayeley",
  tagline: "Stay Plugged In",
  domain: "PluggedByAyeley.com",
  ukSourced: "Original UK-Sourced Products",
  whatsappNumber: "233200000000", // Replace with actual WhatsApp number (country code, no +)
  whatsappDisplay: "+233 20 000 0000",
  email: "hello@pluggedbyayeley.com",
  phone: "+233 20 000 0000",
  snapchat: "itz_Ayeley",
  social: [
    { platform: "Snapchat", handle: "@itz_Ayeley", url: "https://www.snapchat.com/add/itz_Ayeley", icon: "snapchat" },
    // Add more platforms here as they become available
    // { platform: "Instagram", handle: "@pluggedbyayeley", url: "https://instagram.com/pluggedbyayeley", icon: "instagram" },
  ],
  ghanaRegions,
};

export const CATEGORIES = [
  { name: "Toiletries", slug: "Toiletries", icon: "ShowerHead" },
  { name: "Supplements", slug: "Supplements", icon: "Pill" },
  { name: "Snacks", slug: "Snacks", icon: "Cookie" },
  { name: "Perfumes", slug: "Perfumes", icon: "SprayCan" },
  { name: "Beauty & Skincare", slug: "Beauty & Skincare", icon: "Sparkles" },
  { name: "Hair Care", slug: "Hair Care", icon: "Scissors" },
  { name: "Other Products", slug: "Other Products", icon: "Package" },
];

export function getDeliveryFee(region, subtotal) {
  const r = REGIONS.find((r) => r.name === region);
  return r ? r.fee : 60;
}