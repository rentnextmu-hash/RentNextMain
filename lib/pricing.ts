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
