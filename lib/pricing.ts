// The only place pricing maths happens anywhere in the codebase — pure
// functions, no database access. Both the public booking flow and the
// admin manual-booking form must import from here rather than
// re-implementing any of this.
import { daysBetween } from "@/lib/format";
import type { AddOnPriceType } from "@/types/database";

export type AddOnLine = {
  priceMur: number;
  priceType: AddOnPriceType;
  quantity: number;
};

export function calculateRentalDays(pickupAt: Date | string, returnAt: Date | string): number {
  return daysBetween(pickupAt, returnAt);
}

export function calculateCarTotal(dailyRateMur: number, days: number): number {
  return dailyRateMur * days;
}

export function calculateAddOnTotal(addOns: AddOnLine[], days: number): number {
  return addOns.reduce((sum, addOn) => {
    const unitTotal = addOn.priceType === "per_day" ? addOn.priceMur * days : addOn.priceMur;
    return sum + unitTotal * addOn.quantity;
  }, 0);
}

export type BookingTotal = {
  days: number;
  carTotalMur: number;
  addonsTotalMur: number;
  totalMur: number;
};

export function calculateBookingTotal(params: {
  dailyRateMur: number;
  pickupAt: Date | string;
  returnAt: Date | string;
  addOns?: AddOnLine[];
}): BookingTotal {
  const days = calculateRentalDays(params.pickupAt, params.returnAt);
  const carTotalMur = calculateCarTotal(params.dailyRateMur, days);
  const addonsTotalMur = calculateAddOnTotal(params.addOns ?? [], days);

  return { days, carTotalMur, addonsTotalMur, totalMur: carTotalMur + addonsTotalMur };
}
