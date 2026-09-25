import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type PublicSettings = {
  companyName: string;
  companyTagline: string;
  companyPhone: string;
  companyWhatsapp: string;
  companyEmail: string;
  companyAddress: string;
  companyWebsite: string;
  bookingEmail: string;
  defaultPickupTime: string;
  defaultReturnTime: string;
  minimumRentalDays: number;
  cancellationHours: number;
  rentalFaqs: { question: string; answer: string }[];
};

// Fallbacks only matter if a settings row is ever deleted — the seed
// always writes every key.
const DEFAULTS: PublicSettings = {
  companyName: "Rent Next Car Hire",
  companyTagline: "",
  companyPhone: "",
  companyWhatsapp: "",
  companyEmail: "",
  companyAddress: "",
  companyWebsite: "",
  bookingEmail: "",
  defaultPickupTime: "10:00",
  defaultReturnTime: "10:00",
  minimumRentalDays: 1,
  cancellationHours: 48,
  rentalFaqs: [],
};

/** The settings table is display config, readable by anon (see 0002_rls.sql). */
export async function getPublicSettings(supabase: Client): Promise<PublicSettings> {
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) throw error;

  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  const str = (key: string, fallback: string) => {
    const v = byKey.get(key);
    return typeof v === "string" ? v : fallback;
  };
  const num = (key: string, fallback: number) => {
    const v = byKey.get(key);
    return typeof v === "number" ? v : fallback;
  };

  return {
    companyName: str("company_name", DEFAULTS.companyName),
    companyTagline: str("company_tagline", DEFAULTS.companyTagline),
    companyPhone: str("company_phone", DEFAULTS.companyPhone),
    companyWhatsapp: str("company_whatsapp", DEFAULTS.companyWhatsapp),
    companyEmail: str("company_email", DEFAULTS.companyEmail),
    companyAddress: str("company_address", DEFAULTS.companyAddress),
    companyWebsite: str("company_website", DEFAULTS.companyWebsite),
    bookingEmail: str("booking_email", DEFAULTS.bookingEmail),
    defaultPickupTime: str("default_pickup_time", DEFAULTS.defaultPickupTime),
    defaultReturnTime: str("default_return_time", DEFAULTS.defaultReturnTime),
    minimumRentalDays: num("minimum_rental_days", DEFAULTS.minimumRentalDays),
    cancellationHours: num("cancellation_hours", DEFAULTS.cancellationHours),
    rentalFaqs: faqList(byKey.get("rental_faqs")),
  };
}

/** Editable settings for /admin/settings, split into the form's two groups. */
export type AdminSettings = {
  company: {
    company_name: string;
    company_tagline: string;
    company_email: string;
    company_phone: string;
    company_whatsapp: string;
    company_address: string;
    company_website: string;
  };
  booking: {
    default_pickup_time: string;
    default_return_time: string;
    minimum_rental_days: number;
    advance_booking_days: number;
    cancellation_hours: number;
    booking_email: string;
  };
};

/** Owner-only in practice (RLS blocks other writes); reading is anon-safe. */
export async function getAdminSettings(supabase: Client): Promise<AdminSettings> {
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) throw error;
  const byKey = new Map((data ?? []).map((row) => [row.key, row.value]));
  const str = (key: string, fallback = "") => (typeof byKey.get(key) === "string" ? (byKey.get(key) as string) : fallback);
  const num = (key: string, fallback: number) => (typeof byKey.get(key) === "number" ? (byKey.get(key) as number) : fallback);
  return {
    company: {
      company_name: str("company_name", DEFAULTS.companyName),
      company_tagline: str("company_tagline"),
      company_email: str("company_email"),
      company_phone: str("company_phone"),
      company_whatsapp: str("company_whatsapp"),
      company_address: str("company_address"),
      company_website: str("company_website"),
    },
    booking: {
      default_pickup_time: str("default_pickup_time", DEFAULTS.defaultPickupTime),
      default_return_time: str("default_return_time", DEFAULTS.defaultReturnTime),
      minimum_rental_days: num("minimum_rental_days", 1),
      advance_booking_days: num("advance_booking_days", 365),
      cancellation_hours: num("cancellation_hours", DEFAULTS.cancellationHours),
      booking_email: str("booking_email"),
    },
  };
}

/** A `[{ question, answer }]` JSON value (settings.rental_faqs, locations.faqs), dropping malformed entries. */
export function faqList(value: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) =>
    f && typeof f === "object" && typeof f.question === "string" && typeof f.answer === "string"
      ? [{ question: f.question, answer: f.answer }]
      : [],
  );
}
