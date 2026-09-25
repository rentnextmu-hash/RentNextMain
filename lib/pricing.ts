// The only place pricing maths happens anywhere in the codebase — pure
// functions, no database access. The fleet showcase carousel, the
// category page and the booking flow must all import selectDailyRate()
// from here rather than re-implementing the duration-tier rule.
import { daysBetween } from "@/lib/format";
import type { AddOnPriceType } from "@/types/enums";

export type AddOnLine = {
  priceMur: number;
  priceType: AddOnPriceType;
  quantity: number;
};

/** A vehicle category's three duration-tiered daily rates, matching the real rate card. */
export type CategoryRates = {
  rate1To2Mur: number;
  rate3To5Mur: number;
  rate6PlusMur: number;
};

export function calculateRentalDays(pickupAt: Date | string, returnAt: Date | string): number {
  return daysBetween(pickupAt, returnAt);
}

/**
 * Picks the per-day rate for a given rental length: 1-2 days, 3-5 days,
 * or 6+ days — cheaper per day the longer the rental, matching Rent
 * Next's real pricing. The sole place this rule is expressed.
 */
export function selectDailyRate(rates: CategoryRates, days: number): number {
  if (days <= 2) return rates.rate1To2Mur;
  if (days <= 5) return rates.rate3To5Mur;
  return rates.rate6PlusMur;
}

export function calculateCarTotal(rates: CategoryRates, days: number): number {
  return selectDailyRate(rates, days) * days;
}

export function calculateAddOnTotal(addOns: AddOnLine[], days: number): number {
  return addOns.reduce((sum, addOn) => {
    const unitTotal = addOn.priceType === "per_day" ? addOn.priceMur * days : addOn.priceMur;
    return sum + unitTotal * addOn.quantity;
  }, 0);
}

export type BookingTotal = {
  days: number;
  dailyRateMur: number;
  carTotalMur: number;
  addonsTotalMur: number;
  totalMur: number;
};

export function calculateBookingTotal(params: {
  rates: CategoryRates;
  pickupAt: Date | string;
  returnAt: Date | string;
  addOns?: AddOnLine[];
}): BookingTotal {
  const days = calculateRentalDays(params.pickupAt, params.returnAt);
  const dailyRateMur = selectDailyRate(params.rates, days);
  const carTotalMur = dailyRateMur * days;
  const addonsTotalMur = calculateAddOnTotal(params.addOns ?? [], days);

  return { days, dailyRateMur, carTotalMur, addonsTotalMur, totalMur: carTotalMur + addonsTotalMur };
}

export const AIRPORT_DELIVERY_SLUG = "airport-delivery";
export const HOTEL_DELIVERY_SLUG = "hotel-delivery";

/**
 * Add-ons that are charged automatically by the trip itself rather than
 * chosen by the customer: airport delivery when picking up at the airport,
 * hotel delivery when they asked for the car at their hotel. The extras
 * step shows these ticked and locked; the create-booking Edge Function
 * adds them server-side regardless of what the browser sent, so they
 * can't be dropped from the price by editing the request.
 */
export function lockedAddOnSlugs(trip: { pickupLocationType: string; hotelDelivery: boolean }): string[] {
  const slugs: string[] = [];
  if (trip.pickupLocationType === "airport") slugs.push(AIRPORT_DELIVERY_SLUG);
  if (trip.hotelDelivery) slugs.push(HOTEL_DELIVERY_SLUG);
  return slugs;
}

/**
 * The cheapest per-day rate across a set of categories — the honest "from
 * Rs X/day" figure (the 6+ day tier of the cheapest car). null if empty.
 */
export function lowestDailyRate(rates: CategoryRates[]): number | null {
  if (rates.length === 0) return null;
  return Math.min(...rates.map((r) => Math.min(r.rate1To2Mur, r.rate3To5Mur, r.rate6PlusMur)));
}
