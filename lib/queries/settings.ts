import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type PublicSettings = {
  companyName: string;
  companyPhone: string;
  bookingEmail: string;
  defaultPickupTime: string;
  defaultReturnTime: string;
  minimumRentalDays: number;
};

// Fallbacks only matter if a settings row is ever deleted — the seed
// always writes every key.
const DEFAULTS: PublicSettings = {
  companyName: "Rent Next Car Hire",
  companyPhone: "",
  bookingEmail: "",
  defaultPickupTime: "10:00",
  defaultReturnTime: "10:00",
  minimumRentalDays: 1,
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
    companyPhone: str("company_phone", DEFAULTS.companyPhone),
    bookingEmail: str("booking_email", DEFAULTS.bookingEmail),
    defaultPickupTime: str("default_pickup_time", DEFAULTS.defaultPickupTime),
    defaultReturnTime: str("default_return_time", DEFAULTS.defaultReturnTime),
    minimumRentalDays: num("minimum_rental_days", DEFAULTS.minimumRentalDays),
  };
}
