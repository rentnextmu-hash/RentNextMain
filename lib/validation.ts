// Zod schemas shared between client-side forms and server-side validation
// — including the Edge Functions in supabase/functions/, which import this
// file directly through their import map. Keep it free of Next.js- or
// browser-only imports so it stays loadable under Deno.
import { z } from "zod";

// z.guid() rather than z.uuid(): the seed data uses readable fixed ids like
// 10000000-0000-0000-0000-000000000001, which are valid Postgres uuids but
// not RFC 4122 (no version nibble), so z.uuid() would reject them.
const id = z.guid();

/** "2026-09-28T10:00:00+04:00" — always with an explicit offset, see mauritiusDateTime(). */
const dateTime = z.iso.datetime({ offset: true });

export const availabilityRequestSchema = z
  .object({
    locationId: id,
    from: dateTime,
    to: dateTime,
  })
  .refine((v) => new Date(v.to) > new Date(v.from), {
    message: "Return must be after pickup.",
    path: ["to"],
  });

export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;

// International format: a leading +, then digits with optional spaces or
// dashes — "+230 5712 3456", "+33 6 12 34 56 78".
const PHONE_PATTERN = /^\+\d[\d\s-]{6,20}$/;

export const customerDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80),
  email: z.email("Enter a valid email address.").trim().max(200),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, "Enter your phone number in international format, e.g. +33 6 12 34 56 78."),
  country: z.string().trim().min(1, "Choose your country.").max(80),
  hotelName: z.string().trim().max(120).optional(),
  flightNumber: z
    .string()
    .trim()
    .max(12)
    .regex(/^[A-Za-z0-9]{2,3}\s?\d{1,5}[A-Za-z]?$/, "Enter a flight number like MK 015 or AF 474.")
    .optional()
    .or(z.literal("")),
  specialRequests: z.string().trim().max(1000, "Keep special requests under 1,000 characters.").optional(),
  acceptTerms: z.literal(true, "You need to accept the rental terms to continue."),
  marketingConsent: z.boolean(),
});

export type CustomerDetails = z.infer<typeof customerDetailsSchema>;

export const bookingAddOnSchema = z.object({
  addOnId: id,
  quantity: z.int().min(1).max(10),
});

export const createBookingSchema = z
  .object({
    categoryId: id,
    pickupLocationId: id,
    returnLocationId: id,
    pickupAt: dateTime,
    returnAt: dateTime,
    hotelId: id.nullable(),
    addOns: z.array(bookingAddOnSchema).max(20),
    customer: customerDetailsSchema,
  })
  .refine((v) => new Date(v.returnAt) > new Date(v.pickupAt), {
    message: "Return must be after pickup.",
    path: ["returnAt"],
  })
  .refine((v) => new Set(v.addOns.map((a) => a.addOnId)).size === v.addOns.length, {
    message: "Each extra can only be listed once.",
    path: ["addOns"],
  });

export type CreateBookingRequest = z.infer<typeof createBookingSchema>;

export const getBookingRequestSchema = z.object({
  reference: z.string().regex(/^CR-\d{8}-\d{3,}$/),
  key: z.string().min(16).max(64),
});

export type GetBookingRequest = z.infer<typeof getBookingRequestSchema>;

/** Structured error body every booking Edge Function returns on failure. */
export type BookingApiError = {
  error: {
    code: "invalid_request" | "unavailable" | "not_found" | "server_error";
    message: string;
    fields?: Record<string, string[]>;
  };
};

/**
 * What get-booking returns: everything the confirmation page shows, and
 * nothing more. Deliberately no vehicle — even once staff assign one, its
 * code and registration never reach the public site.
 */
export type PublicBookingView = {
  reference: string;
  status: string;
  createdAt: string;
  pickupAt: string;
  returnAt: string;
  days: number;
  carTotalMur: number;
  addonsTotalMur: number;
  totalMur: number;
  customer: { firstName: string; lastName: string; email: string };
  category: {
    name: string;
    slug: string;
    category: string;
    imagePath: string | null;
    transmission: string;
    seats: number;
  };
  pickupLocation: { name: string; address: string | null };
  returnLocation: { name: string; address: string | null };
  hotelName: string | null;
  addOns: { name: string; quantity: number; unitPriceMur: number; totalMur: number; priceType: string }[];
};

// ── Admin booking operations ───────────────────────────────────────────

export const recordPaymentSchema = z.object({
  amountMur: z.coerce.number().int("Whole rupees only.").min(1, "Enter an amount.").max(10_000_000),
  method: z.enum(["cash", "card", "transfer", "online"], "Choose how it was paid."),
  reference: z.string().trim().max(100).optional(),
});

export const completeBookingSchema = z.object({
  returnMileageKm: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number("Enter the mileage on return.").int("Whole kilometres only.").min(0).max(2_000_000),
  ),
});

export const internalNotesSchema = z.object({
  notes: z.string().max(5000, "Keep notes under 5,000 characters."),
});

// ── Fleet ──────────────────────────────────────────────────────────────

// Form fields arrive as "" when left blank; treat that as "not given".
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** "VITZ-011": model prefix, dash, at least three digits. */
export const VEHICLE_CODE_PATTERN = /^[A-Z0-9]+-\d{3,}$/;

export const vehicleFormSchema = z.object({
  categoryId: z.guid("Choose a category."),
  registration: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(2, "Enter the registration plate.")
        .max(20)
        .regex(/^[A-Z0-9 -]+$/, "Letters, numbers and spaces only, e.g. 1101 GB 23."),
    ),
  code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(VEHICLE_CODE_PATTERN, "Use the MODEL-NNN format, e.g. VITZ-011.")),
  locationId: z.guid("Choose a location."),
  status: z.enum(["available", "booked", "maintenance", "inactive"]),
  // Blank must be an error, not 0 — z.coerce.number() alone turns "" into 0.
  mileageKm: z.preprocess(
    blankToUndefined,
    z.coerce.number("Enter the mileage.").int("Whole kilometres only.").min(0).max(2_000_000),
  ),
  year: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1990, "Year looks too early.").max(new Date().getFullYear() + 1).optional(),
  ),
  colour: z.preprocess(blankToUndefined, z.string().trim().max(40).optional()),
  acquiredAt: z.preprocess(blankToUndefined, z.iso.date("Enter a valid date.").optional()),
  notes: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export const vehicleStatusSchema = z.object({
  status: z.enum(["available", "booked", "maintenance", "inactive"], "Choose a status."),
});

// ── Staff-created bookings (/admin/bookings/new) ────────────────────────

export const staffCustomerSchema = customerDetailsSchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  country: true,
});

export const staffBookingSchema = z
  .object({
    customerId: id.nullable(),
    newCustomer: staffCustomerSchema.nullable(),
    categoryId: id,
    vehicleId: id.nullable(),
    pickupLocationId: id,
    returnLocationId: id,
    pickupAt: dateTime,
    returnAt: dateTime,
    addOns: z.array(bookingAddOnSchema).max(20),
    source: z.enum(["phone", "hotel", "walk_in"], "Choose where the booking came from."),
    hotelId: id.nullable(),
    status: z.enum(["requested", "confirmed"]),
    overrideTotalMur: z.int("Whole rupees only.").min(0).max(10_000_000).nullable(),
    overrideReason: z.string().trim().max(300),
    notes: z.string().trim().max(5000),
  })
  .refine((v) => (v.customerId === null) !== (v.newCustomer === null), {
    message: "Choose an existing customer or enter a new one.",
    path: ["customerId"],
  })
  .refine((v) => new Date(v.returnAt) > new Date(v.pickupAt), {
    message: "Return must be after pickup.",
    path: ["returnAt"],
  })
  .refine((v) => v.source !== "hotel" || v.hotelId !== null, {
    message: "Choose the hotel this booking came from.",
    path: ["hotelId"],
  })
  .refine((v) => v.overrideTotalMur === null || v.overrideReason.length >= 3, {
    message: "Give a reason for the price override.",
    path: ["overrideReason"],
  })
  .refine((v) => new Set(v.addOns.map((a) => a.addOnId)).size === v.addOns.length, {
    message: "Each extra can only be listed once.",
    path: ["addOns"],
  });

export type StaffBookingRequest = z.infer<typeof staffBookingSchema>;

// ── Locations admin (P9.1) ──────────────────────────────────────────────

/** Kebab-case, e.g. "flic-en-flac" — the public page's URL. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const locationFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the location's name.").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_PATTERN, "Lower-case words joined by hyphens, e.g. flic-en-flac."),
  type: z.enum(["branch", "airport", "hotel", "custom"]),
  region: optionalText(80),
  address: optionalText(200),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  isPickupPoint: z.boolean(),
  isActive: z.boolean(),
  openingHours: optionalText(100),
  seoTitle: optionalText(120),
  // Google shows ~160 characters; the form warns past that, this only caps abuse.
  seoDescription: optionalText(300),
  introContent: optionalText(4000),
  driveTimes: z
    .array(
      z.object({
        place: z.string().trim().min(1, "Name the place.").max(80),
        minutes: z.int("Whole minutes.").min(1, "At least 1 minute.").max(600),
      }),
    )
    .max(10, "Ten places at most."),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(3, "Write the question.").max(200),
        answer: z.string().trim().min(3, "Write the answer.").max(1000),
      }),
    )
    .max(10, "Ten questions at most."),
});

export type LocationFormValues = z.input<typeof locationFormSchema>;

// ── Hotel partners (P9.2) ───────────────────────────────────────────────

export const hotelFormSchema = z.object({
  name: z.string().trim().min(2, "Enter the hotel's name.").max(120),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, "Lower-case words joined by hyphens, e.g. le-recif-resort."),
  locationId: id.nullable(),
  contactName: optionalText(120),
  contactEmail: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email("Enter a valid email address.").nullable()),
  contactPhone: optionalText(40),
  contractStatus: z.enum(["active", "pending", "inactive"]),
  contractStartDate: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.iso.date("Enter a valid date.").nullable()),
  commissionRate: z.number("Enter a percentage.").min(0, "Can't be negative.").max(50, "That looks too high — 50% at most."),
  pickupNotes: optionalText(1000),
  isActive: z.boolean(),
});

export type HotelFormValues = z.input<typeof hotelFormSchema>;

// ── Settings, categories, add-ons (P9.3) ────────────────────────────────

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const settingsFormSchema = z.object({
  company: z.object({
    company_name: z.string().trim().min(1, "Enter the company name.").max(120),
    company_tagline: z.string().trim().max(160),
    company_email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
    company_phone: z.string().trim().max(40),
    company_whatsapp: z.string().trim().max(40),
    company_address: z.string().trim().max(300),
    company_website: z.string().trim().max(120),
  }),
  booking: z.object({
    default_pickup_time: z.string().regex(TIME_PATTERN, "Use HH:mm, e.g. 10:00."),
    default_return_time: z.string().regex(TIME_PATTERN, "Use HH:mm, e.g. 10:00."),
    minimum_rental_days: z.coerce.number().int("Whole days.").min(1, "At least 1 day.").max(30),
    advance_booking_days: z.coerce.number().int("Whole days.").min(1, "At least 1 day.").max(730),
    cancellation_hours: z.coerce.number().int("Whole hours.").min(0).max(720),
    booking_email: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  }),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

// Rates strictly decrease with duration in this model; the form enforces
// 1–2 day ≥ 3–5 day ≥ 6+ day so the public "from" price stays honest.
const rate = z.coerce.number("Enter a rate.").int("Whole rupees.").min(1, "Must be positive.").max(1_000_000);

export const categoryFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the name.").max(80),
    tagline: optionalText(160),
    bestFor: optionalText(120),
    description: optionalText(600),
    transmission: z.enum(["automatic", "manual"]),
    fuelType: z.enum(["petrol", "diesel", "hybrid", "electric"]),
    seats: z.coerce.number().int().min(1).max(20),
    doors: z.coerce.number().int().min(1).max(10),
    luggageCapacity: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(20).nullable().default(null)),
    airConditioning: z.boolean(),
    rate12: rate,
    rate35: rate,
    rate6: rate,
    isActive: z.boolean(),
  })
  .refine((v) => v.rate12 >= v.rate35 && v.rate35 >= v.rate6, {
    message: "Rates should fall (or stay level) the longer the rental: 1–2 days ≥ 3–5 days ≥ 6+ days.",
    path: ["rate35"],
  });

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

/** Just the three rates, for the inline table edit. */
export const categoryRatesSchema = z
  .object({ rate12: rate, rate35: rate, rate6: rate })
  .refine((v) => v.rate12 >= v.rate35 && v.rate35 >= v.rate6, {
    message: "Rates should fall the longer the rental.",
    path: ["rate35"],
  });

export const addOnFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the name.").max(80),
  description: optionalText(300),
  priceMur: z.coerce.number("Enter a price.").int("Whole rupees.").min(0).max(1_000_000),
  priceType: z.enum(["per_day", "per_booking"]),
  maxQuantity: z.coerce.number().int().min(1, "At least 1.").max(10),
  isActive: z.boolean(),
});

export type AddOnFormValues = z.infer<typeof addOnFormSchema>;
