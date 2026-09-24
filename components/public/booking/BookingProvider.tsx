"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDaysToDateKey, mauritiusDateTime, toDateKey } from "@/lib/format";
import { calculateBookingTotal, calculateRentalDays, lockedAddOnSlugs, type BookingTotal } from "@/lib/pricing";
import { customerDetailsSchema } from "@/lib/validation";
import type {
  BookingAddOn,
  BookingCategory,
  BookingFlowData,
  BookingLocation,
} from "@/lib/queries/bookingFlow";
import type { PartnerHotel } from "@/lib/queries/hotels";

// ── Steps ───────────────────────────────────────────────────────────────

export const BOOKING_STEPS = [
  { key: "car", label: "Car", href: "/booking/car" },
  { key: "trip", label: "Trip", href: "/booking/trip" },
  { key: "extras", label: "Extras", href: "/booking/extras" },
  { key: "details", label: "Your details", href: "/booking/details" },
  { key: "summary", label: "Review", href: "/booking/summary" },
] as const;

export type StepKey = (typeof BOOKING_STEPS)[number]["key"];

// ── State ───────────────────────────────────────────────────────────────

export type CustomerDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  hotelName: string;
  flightNumber: string;
  specialRequests: string;
  acceptTerms: boolean;
  marketingConsent: boolean;
};

export type BookingState = {
  categoryId: string | null;
  pickupLocationId: string | null;
  returnLocationId: string | null;
  differentReturn: boolean;
  /** "YYYY-MM-DD", Mauritius calendar date. */
  pickupDate: string;
  /** "HH:mm", Mauritius wall-clock time. */
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  hotelDelivery: boolean;
  hotelId: string | null;
  /** Customer-chosen extras, add-on id -> quantity. Locked extras are derived, never stored. */
  addOns: Record<string, number>;
  customer: CustomerDraft;
  /** Steps the customer has explicitly continued past. */
  confirmed: StepKey[];
};

const STORAGE_KEY = "rn_booking_v1";

// France is the largest visitor market, per the blueprint.
const DEFAULT_COUNTRY = "France";

function initialState(data: BookingFlowData): BookingState {
  const pickupDate = addDaysToDateKey(toDateKey(), 1);
  const firstPickup = data.locations.find((l) => l.isPickupPoint) ?? null;
  return {
    categoryId: null,
    pickupLocationId: firstPickup?.id ?? null,
    returnLocationId: firstPickup?.id ?? null,
    differentReturn: false,
    pickupDate,
    pickupTime: data.settings.defaultPickupTime,
    returnDate: addDaysToDateKey(pickupDate, Math.max(5, data.settings.minimumRentalDays)),
    returnTime: data.settings.defaultReturnTime,
    hotelDelivery: false,
    hotelId: null,
    addOns: {},
    customer: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "+230 ",
      country: DEFAULT_COUNTRY,
      hotelName: "",
      flightNumber: "",
      specialRequests: "",
      acceptTerms: false,
      marketingConsent: false,
    },
    confirmed: [],
  };
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Entry from elsewhere on the site — /booking/trip?category=toyota-vitz&
 * location=grand-baie&from=2026-09-28&to=2026-10-03 — overrides whatever
 * was in progress for those fields. Slugs in the URL, ids in state.
 */
function applyUrlParams(state: BookingState, params: URLSearchParams, data: BookingFlowData): BookingState {
  const next = { ...state };
  const category = data.categories.find((c) => c.slug === params.get("category"));
  const location = data.locations.find((l) => l.slug === params.get("location") && l.isPickupPoint);
  const from = params.get("from");
  const to = params.get("to");

  if (category) {
    next.categoryId = category.id;
    if (!next.confirmed.includes("car")) next.confirmed = [...next.confirmed, "car"];
  }
  if (location) {
    next.pickupLocationId = location.id;
    if (!next.differentReturn) next.returnLocationId = location.id;
    // A hotel near the old pickup location may not be near the new one.
    if (next.hotelId && data.hotels.find((h) => h.id === next.hotelId)?.locationId !== location.id) {
      next.hotelId = null;
      next.hotelDelivery = false;
    }
  }
  if (from && DATE_KEY.test(from)) next.pickupDate = from;
  if (to && DATE_KEY.test(to)) next.returnDate = to;
  return next;
}

// ── Derived values ──────────────────────────────────────────────────────

export type TripErrors = Partial<Record<"pickupLocation" | "pickupAt" | "returnAt" | "hotel", string>>;

export function validateTrip(state: BookingState, data: BookingFlowData, now = new Date()): TripErrors {
  const errors: TripErrors = {};
  const pickupLocation = data.locations.find((l) => l.id === state.pickupLocationId);
  if (!pickupLocation?.isPickupPoint) errors.pickupLocation = "Choose a pickup location.";

  const pickupAt = mauritiusDateTime(state.pickupDate, state.pickupTime);
  const returnAt = mauritiusDateTime(state.returnDate, state.returnTime);

  if (new Date(pickupAt) <= now) {
    errors.pickupAt = "That pickup time has already passed.";
  }
  if (new Date(returnAt) <= new Date(pickupAt)) {
    errors.returnAt = "Return must be after pickup.";
  } else if (calculateRentalDays(pickupAt, returnAt) < data.settings.minimumRentalDays) {
    errors.returnAt = `The minimum rental is ${data.settings.minimumRentalDays} days.`;
  }
  if (state.hotelDelivery && !state.hotelId) errors.hotel = "Choose your hotel, or turn off hotel delivery.";
  return errors;
}

export type AddOnSelection = { addOn: BookingAddOn; quantity: number; locked: boolean };

type BookingContextValue = {
  data: BookingFlowData;
  state: BookingState;
  hydrated: boolean;
  update: (patch: Partial<BookingState> | ((s: BookingState) => Partial<BookingState>)) => void;
  confirmStep: (step: StepKey) => void;
  /** Called once a booking has been created, just before leaving the flow. */
  finish: () => void;

  category: BookingCategory | null;
  pickupLocation: BookingLocation | null;
  returnLocation: BookingLocation | null;
  hotel: PartnerHotel | null;
  pickupAt: string;
  returnAt: string;
  tripErrors: TripErrors;
  lockedAddOnIds: Set<string>;
  selectedAddOns: AddOnSelection[];
  /** Always recomputed from lib/pricing.ts — never a stored total. */
  pricing: BookingTotal | null;
  isStepComplete: (step: StepKey) => boolean;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}

export function BookingProvider({ data, children }: { data: BookingFlowData; children: ReactNode }) {
  const [state, setState] = useState<BookingState>(() => initialState(data));
  const [hydrated, setHydrated] = useState(false);
  const finished = useRef(false);
  // useSearchParams(), not window.location: on a client-side navigation
  // into the flow (clicking "Book" on /cars), this effect runs before Next
  // has pushed the new URL, so window.location still shows the old page.
  const searchParams = useSearchParams();
  const entryParams = useRef(searchParams);
  const pathname = usePathname();
  const entryPath = useRef(pathname);

  // Hydrate once on mount: sessionStorage first, then any URL params on top.
  useEffect(() => {
    let restored = initialState(data);
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) restored = { ...restored, ...(JSON.parse(raw) as Partial<BookingState>) };
    } catch {
      // Private mode or corrupt JSON — start fresh.
    }

    const params = new URLSearchParams(entryParams.current.toString());
    if (params.size > 0) {
      restored = applyUrlParams(restored, params, data);
      // Tidy the params away so a refresh doesn't re-apply them over edits.
      window.history.replaceState(null, "", entryPath.current);
    }

    // Past dates from a session left open overnight: roll forward rather
    // than showing an error before the customer has touched anything.
    const today = toDateKey();
    if (restored.pickupDate < today) {
      const length = Math.max(
        data.settings.minimumRentalDays,
        calculateRentalDays(restored.pickupDate, restored.returnDate),
      );
      restored.pickupDate = addDaysToDateKey(today, 1);
      restored.returnDate = addDaysToDateKey(restored.pickupDate, length);
    }

    // Drop ids that no longer exist (a category deactivated since last visit).
    if (restored.categoryId && !data.categories.some((c) => c.id === restored.categoryId)) {
      restored.categoryId = null;
      restored.confirmed = [];
    }

    setState(restored);
    setHydrated(true);
  }, [data]);

  useEffect(() => {
    if (!hydrated || finished.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or unavailable — the flow still works, it just won't survive a refresh.
    }
  }, [state, hydrated]);

  const update = useCallback<BookingContextValue["update"]>((patch) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const confirmStep = useCallback((step: StepKey) => {
    setState((s) => (s.confirmed.includes(step) ? s : { ...s, confirmed: [...s.confirmed, step] }));
  }, []);

  const finish = useCallback(() => {
    finished.current = true;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<BookingContextValue>(() => {
    const category = data.categories.find((c) => c.id === state.categoryId) ?? null;
    const pickupLocation = data.locations.find((l) => l.id === state.pickupLocationId) ?? null;
    const returnLocation =
      data.locations.find((l) => l.id === (state.differentReturn ? state.returnLocationId : state.pickupLocationId)) ??
      null;
    const hotel = state.hotelDelivery ? (data.hotels.find((h) => h.id === state.hotelId) ?? null) : null;
    const pickupAt = mauritiusDateTime(state.pickupDate, state.pickupTime);
    const returnAt = mauritiusDateTime(state.returnDate, state.returnTime);
    const tripErrors = validateTrip(state, data);

    const lockedSlugs = lockedAddOnSlugs({
      pickupLocationType: pickupLocation?.type ?? "",
      hotelDelivery: state.hotelDelivery,
    });
    const lockedAddOnIds = new Set(data.addOns.filter((a) => lockedSlugs.includes(a.slug)).map((a) => a.id));

    const selectedAddOns: AddOnSelection[] = data.addOns.flatMap((addOn): AddOnSelection[] => {
      if (lockedAddOnIds.has(addOn.id)) return [{ addOn, quantity: 1, locked: true }];
      const quantity = state.addOns[addOn.id] ?? 0;
      return quantity > 0 ? [{ addOn, quantity: Math.min(quantity, addOn.maxQuantity), locked: false }] : [];
    });

    const tripValid = Object.keys(tripErrors).length === 0;
    const pricing =
      category && new Date(returnAt) > new Date(pickupAt)
        ? calculateBookingTotal({
            rates: category.rates,
            pickupAt,
            returnAt,
            addOns: selectedAddOns.map((s) => ({
              priceMur: s.addOn.priceMur,
              priceType: s.addOn.priceType,
              quantity: s.quantity,
            })),
          })
        : null;

    const valid: Record<StepKey, boolean> = {
      car: !!category,
      trip: !!category && tripValid,
      extras: true,
      details: customerDetailsSchema.safeParse({
        ...state.customer,
        flightNumber: pickupLocation?.type === "airport" ? state.customer.flightNumber : "",
      }).success,
      summary: false,
    };
    const isStepComplete = (step: StepKey) => state.confirmed.includes(step) && valid[step];

    return {
      data,
      state,
      hydrated,
      update,
      confirmStep,
      finish,
      category,
      pickupLocation,
      returnLocation,
      hotel,
      pickupAt,
      returnAt,
      tripErrors,
      lockedAddOnIds,
      selectedAddOns,
      pricing,
      isStepComplete,
    };
  }, [data, state, hydrated, update, confirmStep, finish]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

/**
 * Guard for a step page: if any earlier step isn't complete, send the
 * customer back to the first one that isn't, rather than rendering a
 * broken page. Returns true once it's safe to render.
 */
export function useStepGuard(step: StepKey): boolean {
  const { hydrated, isStepComplete } = useBooking();
  const router = useRouter();
  const pathname = usePathname();

  const index = BOOKING_STEPS.findIndex((s) => s.key === step);
  const firstIncomplete = hydrated
    ? BOOKING_STEPS.slice(0, index).find((s) => !isStepComplete(s.key))
    : undefined;

  useEffect(() => {
    if (firstIncomplete && pathname !== firstIncomplete.href) router.replace(firstIncomplete.href);
  }, [firstIncomplete, pathname, router]);

  return hydrated && !firstIncomplete;
}
