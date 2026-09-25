"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { CarLoader } from "@/components/public/CarLoader";
import { HANDOVER_TIMES } from "@/components/public/booking/tripOptions";
import { OTHER_COUNTRIES, TOP_COUNTRIES } from "@/components/public/booking/countries";
import { addDaysToDateKey, formatMUR, mauritiusDateTime } from "@/lib/format";
import {
  calculateAddOnTotal,
  calculateBookingTotal,
  lockedAddOnSlugs,
  type AddOnLine,
  type CategoryRates,
} from "@/lib/pricing";
import type { AvailableVehicle } from "@/lib/availability";
import type { CustomerMatch } from "@/lib/queries/customers";
import type { StaffBookingRequest } from "@/lib/validation";
import type { AddOnPriceType, LocationType } from "@/types/enums";
import { cn } from "@/lib/utils";
import {
  availableVehiclesAction,
  createStaffBookingAction,
  searchCustomersAction,
} from "@/app/(admin)/admin/bookings/new/actions";

export type StaffBookingPrefill = {
  categoryId: string;
  vehicleId: string | null;
  locationId: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
};

type Category = { id: string; name: string; rates: CategoryRates };
type Location = { id: string; name: string; type: LocationType };
type AddOn = { id: string; slug: string; name: string; priceMur: number; priceType: AddOnPriceType; maxQuantity: number };
type Hotel = { id: string; name: string; locationId: string | null };

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5", className)}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      {children}
    </section>
  );
}

const SOURCES = [
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk-in" },
  { value: "hotel", label: "Hotel" },
] as const;

export function StaffBookingForm({
  prefill,
  minimumRentalDays,
  categories,
  locations,
  addOns,
  hotels,
}: {
  prefill: StaffBookingPrefill;
  minimumRentalDays: number;
  categories: Category[];
  locations: Location[];
  addOns: AddOn[];
  hotels: Hotel[];
}) {
  const router = useRouter();
  const [submitting, startSubmit] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Customer ──
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CustomerMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [customer, setCustomer] = useState<CustomerMatch | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "+230 ",
    country: "Mauritius",
  });

  useEffect(() => {
    if (customerMode !== "existing" || customer || query.trim().length < 2) {
      setMatches(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const found = await searchCustomersAction(query).catch(() => []);
      if (!cancelled) {
        setMatches(found);
        setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, customerMode, customer]);

  // ── Rental ──
  const [pickupLocationId, setPickupLocationId] = useState(prefill.locationId);
  const [differentReturn, setDifferentReturn] = useState(false);
  const [returnLocationId, setReturnLocationId] = useState(prefill.locationId);
  const [pickupDate, setPickupDate] = useState(prefill.pickupDate);
  const [pickupTime, setPickupTime] = useState(prefill.pickupTime);
  const [returnDate, setReturnDate] = useState(prefill.returnDate);
  const [returnTime, setReturnTime] = useState(prefill.returnTime);
  const pickupAt = mauritiusDateTime(pickupDate, pickupTime);
  const returnAt = mauritiusDateTime(returnDate, returnTime);
  const datesValid = !!pickupDate && !!returnDate && new Date(returnAt) > new Date(pickupAt);
  const effectiveReturnId = differentReturn ? returnLocationId : pickupLocationId;
  const pickupLocation = locations.find((l) => l.id === pickupLocationId);

  // ── Vehicle ──
  const [categoryId, setCategoryId] = useState(prefill.categoryId);
  const [vehicleId, setVehicleId] = useState<string | null>(prefill.vehicleId);
  const [vehicles, setVehicles] = useState<AvailableVehicle[] | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const prefilledVehicle = useRef(prefill.vehicleId);

  useEffect(() => {
    if (!categoryId || !datesValid || !pickupLocationId) {
      setVehicles(null);
      return;
    }
    let cancelled = false;
    setLoadingVehicles(true);
    const timer = setTimeout(async () => {
      const list = await availableVehiclesAction({
        categoryId,
        from: pickupAt,
        to: returnAt,
        preferLocationId: pickupLocationId,
      }).catch(() => [] as AvailableVehicle[]);
      if (cancelled) return;
      setVehicles(list);
      setLoadingVehicles(false);
      // Drop a selection that's no longer free (dates or category changed).
      setVehicleId((current) => (current && !list.some((v) => v.id === current) ? null : current));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [categoryId, pickupAt, returnAt, pickupLocationId, datesValid]);

  // ── Add-ons ──
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, number>>({});
  // Same rule as the website (lib/pricing.ts): airport pickups include airport
  // delivery. Ticked automatically when the pickup location becomes the
  // airport; staff can still untick it.
  useEffect(() => {
    const slugs = lockedAddOnSlugs({ pickupLocationType: pickupLocation?.type ?? "", hotelDelivery: false });
    const ids = addOns.filter((a) => slugs.includes(a.slug)).map((a) => a.id);
    if (ids.length > 0) setSelectedAddOns((s) => ({ ...s, ...Object.fromEntries(ids.map((id) => [id, 1])) }));
  }, [pickupLocation?.type, addOns]);

  // ── Source, status, price, notes ──
  const [source, setSource] = useState<StaffBookingRequest["source"]>("phone");
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [status, setStatus] = useState<StaffBookingRequest["status"]>("confirmed");
  const [overriding, setOverriding] = useState(false);
  const [overrideTotal, setOverrideTotal] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [notes, setNotes] = useState("");

  const category = categories.find((c) => c.id === categoryId);
  const addOnLines = useMemo(
    () =>
      addOns
        .filter((a) => (selectedAddOns[a.id] ?? 0) > 0)
        .map((a) => ({ addOn: a, line: { priceMur: a.priceMur, priceType: a.priceType, quantity: selectedAddOns[a.id] } as AddOnLine })),
    [addOns, selectedAddOns],
  );
  const pricing =
    category && datesValid
      ? calculateBookingTotal({ rates: category.rates, pickupAt, returnAt, addOns: addOnLines.map((l) => l.line) })
      : null;
  const overrideValue = overriding && overrideTotal.trim() !== "" ? Number(overrideTotal) : null;
  const finalTotal = overrideValue ?? pricing?.totalMur ?? null;

  const nearbyHotels = hotels.filter((h) => h.locationId === pickupLocationId);
  const otherHotels = hotels.filter((h) => h.locationId !== pickupLocationId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const local: Record<string, string> = {};
    if (customerMode === "existing" && !customer) local.customerId = "Search for and choose a customer, or add a new one.";
    if (!categoryId) local.categoryId = "Choose a category.";
    if (overriding && (overrideValue === null || !Number.isInteger(overrideValue) || overrideValue < 0)) {
      local.overrideTotalMur = "Enter the agreed total in whole rupees.";
    }
    if (Object.keys(local).length > 0) {
      setErrors(local);
      setFormError("Check the highlighted fields.");
      return;
    }

    const payload: StaffBookingRequest = {
      customerId: customerMode === "existing" ? customer!.id : null,
      newCustomer: customerMode === "new" ? newCustomer : null,
      categoryId,
      vehicleId,
      pickupLocationId,
      returnLocationId: effectiveReturnId,
      pickupAt,
      returnAt,
      addOns: addOnLines.map(({ addOn, line }) => ({ addOnId: addOn.id, quantity: line.quantity })),
      source,
      hotelId: source === "hotel" ? hotelId : null,
      status,
      overrideTotalMur: overriding ? overrideValue : null,
      overrideReason: overriding ? overrideReason : "",
      notes,
    };

    startSubmit(async () => {
      const result = await createStaffBookingAction(payload);
      if (result.ok) {
        router.push(`/admin/bookings/${result.reference}?created=1`);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
    });
  }

  // Clear a field's error as soon as the field changes, rather than
  // leaving it red until the next submit.
  const clearErrors = (...keys: string[]) =>
    setErrors((e) => {
      if (!keys.some((k) => Object.keys(e).some((key) => key === k || key.startsWith(`${k}.`)))) return e;
      return Object.fromEntries(Object.entries(e).filter(([key]) => !keys.some((k) => key === k || key.startsWith(`${k}.`))));
    });
  useEffect(() => clearErrors("customerId"), [customer, customerMode]);
  useEffect(() => clearErrors("newCustomer"), [newCustomer]);
  useEffect(() => clearErrors("categoryId"), [categoryId]);
  useEffect(() => clearErrors("vehicleId"), [vehicleId]);
  useEffect(() => clearErrors("hotelId"), [hotelId, source]);
  useEffect(() => clearErrors("overrideTotalMur", "overrideReason"), [overrideTotal, overrideReason, overriding]);
  useEffect(() => clearErrors("returnAt"), [pickupAt, returnAt]);
  useEffect(() => {
    if (Object.keys(errors).length === 0) setFormError(null);
  }, [errors]);

  const err = (key: string) => errors[key];

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Customer">
          <div className="mb-4 inline-flex rounded-[var(--radius-md)] border border-admin-border p-0.5" role="tablist">
            {(
              [
                { mode: "existing", label: "Existing customer", Icon: Users },
                { mode: "new", label: "New customer", Icon: UserPlus },
              ] as const
            ).map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={customerMode === mode}
                onClick={() => setCustomerMode(mode)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-sm font-medium",
                  customerMode === mode ? "bg-primary text-white" : "text-text-muted hover:text-text",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {customerMode === "existing" ? (
            customer ? (
              <div className="flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-primary/40 bg-primary/5 px-4 py-3">
                <div className="text-sm">
                  <p className="font-medium text-text">
                    {customer.firstName} {customer.lastName}
                  </p>
                  <p className="text-text-muted">
                    {customer.email} · {customer.phone}
                  </p>
                  <p className="text-xs text-text-muted">
                    {customer.bookingCount} previous booking{customer.bookingCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomer(null)}
                  className="text-text-muted hover:text-text"
                  aria-label="Choose a different customer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div>
                <Input
                  label="Find customer"
                  placeholder="Name, email or phone"
                  prefix={<Search className="h-4 w-4" aria-hidden="true" />}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  error={err("customerId")}
                  autoComplete="off"
                />
                {searching && <CarLoader size="sm" className="mt-2" />}
                {matches && !searching && (
                  <ul className="mt-2 max-h-64 divide-y divide-admin-border overflow-y-auto rounded-[var(--radius-md)] border border-admin-border">
                    {matches.length === 0 ? (
                      <li className="px-3 py-2.5 text-sm text-text-muted">
                        No match.{" "}
                        <button type="button" className="font-medium text-primary hover:underline" onClick={() => setCustomerMode("new")}>
                          Add as a new customer
                        </button>
                      </li>
                    ) : (
                      matches.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomer(m);
                              setErrors((e) => ({ ...e, customerId: "" }));
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-surface-alt"
                          >
                            <span>
                              <span className="font-medium text-text">
                                {m.firstName} {m.lastName}
                              </span>
                              <span className="block text-xs text-text-muted">
                                {m.email} · {m.phone}
                              </span>
                            </span>
                            <span className="whitespace-nowrap text-xs text-text-muted">
                              {m.bookingCount} booking{m.bookingCount === 1 ? "" : "s"}
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="First name *"
                value={newCustomer.firstName}
                onChange={(e) => setNewCustomer((c) => ({ ...c, firstName: e.target.value }))}
                error={err("newCustomer.firstName")}
              />
              <Input
                label="Last name *"
                value={newCustomer.lastName}
                onChange={(e) => setNewCustomer((c) => ({ ...c, lastName: e.target.value }))}
                error={err("newCustomer.lastName")}
              />
              <Input
                label="Email *"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((c) => ({ ...c, email: e.target.value }))}
                error={err("newCustomer.email")}
                hint="An existing customer with this email is reused, not duplicated."
              />
              <Input
                label="Phone *"
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((c) => ({ ...c, phone: e.target.value }))}
                error={err("newCustomer.phone")}
              />
              <Select
                label="Country"
                value={newCustomer.country}
                onChange={(e) => setNewCustomer((c) => ({ ...c, country: e.target.value }))}
                error={err("newCustomer.country")}
              >
                {[...TOP_COUNTRIES, ...OTHER_COUNTRIES].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Section>

        <Section title="Rental">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Pickup location"
              value={pickupLocationId}
              onChange={(e) => {
                setPickupLocationId(e.target.value);
                setHotelId(null);
              }}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Input
              label="Pickup date"
              type="date"
              value={pickupDate}
              onChange={(e) => {
                const d = e.target.value;
                if (!d) return;
                setPickupDate(d);
                if (returnDate <= d) setReturnDate(addDaysToDateKey(d, Math.max(minimumRentalDays, 1)));
              }}
            />
            <Select label="Pickup time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}>
              {HANDOVER_TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            {differentReturn ? (
              <Select label="Return location" value={returnLocationId} onChange={(e) => setReturnLocationId(e.target.value)}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text">Return location</span>
                <span className="flex h-10 items-center text-sm text-text">{pickupLocation?.name}</span>
              </div>
            )}
            <Input
              label="Return date"
              type="date"
              value={returnDate}
              min={pickupDate}
              onChange={(e) => e.target.value && setReturnDate(e.target.value)}
              error={err("returnAt") || (!datesValid ? "Return must be after pickup." : undefined)}
            />
            <Select label="Return time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)}>
              {HANDOVER_TIMES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Checkbox
              label="Return to a different location"
              checked={differentReturn}
              onChange={(e) => {
                setDifferentReturn(e.target.checked);
                setReturnLocationId(pickupLocationId);
              }}
            />
            {pricing && (
              <span className="text-sm text-text-muted">
                {pricing.days} day{pricing.days === 1 ? "" : "s"}
                {pricing.days < minimumRentalDays && (
                  <span className="text-warning-deep"> · below the website&apos;s {minimumRentalDays}-day minimum</span>
                )}
              </span>
            )}
          </div>
        </Section>

        <Section title="Vehicle">
          <Select
            label="Category *"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setVehicleId(null);
            }}
            error={err("categoryId")}
          >
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {categoryId && datesValid && (
            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-medium text-text">
                Free for these dates {loadingVehicles && <CarLoader size="sm" className="ml-2 inline-flex" />}
              </legend>
              {err("vehicleId") && <p className="mb-2 text-sm text-error">{err("vehicleId")}</p>}
              {prefilledVehicle.current && vehicles && !vehicles.some((v) => v.id === prefilledVehicle.current) && (
                <p className="mb-2 rounded-[var(--radius-md)] bg-warning/10 px-3 py-2 text-sm text-warning-deep">
                  The car you started from isn&apos;t free for these dates.
                </p>
              )}
              <div className="max-h-72 divide-y divide-admin-border overflow-y-auto rounded-[var(--radius-md)] border border-admin-border">
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface-alt">
                  <input
                    type="radio"
                    name="vehicle"
                    checked={vehicleId === null}
                    onChange={() => setVehicleId(null)}
                    className="accent-primary"
                  />
                  <span className="text-text">Leave unassigned for now</span>
                </label>
                {(vehicles ?? []).map((v) => (
                  <label key={v.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface-alt">
                    <input
                      type="radio"
                      name="vehicle"
                      checked={vehicleId === v.id}
                      onChange={() => setVehicleId(v.id)}
                      className="accent-primary"
                    />
                    <span>
                      <span className="font-mono font-semibold text-text">{v.code}</span>{" "}
                      <span className="font-mono text-text-muted">{v.registration}</span>
                      <span className="block text-xs text-text-muted">
                        {v.locationName}
                        {v.locationId === pickupLocationId && " (pickup location)"} · {v.mileageKm.toLocaleString("en-US")} km
                      </span>
                    </span>
                  </label>
                ))}
                {vehicles && vehicles.length === 0 && !loadingVehicles && (
                  <p className="px-3 py-2.5 text-sm text-warning-deep">
                    No {category?.name} is free for these dates. You can still save it unassigned.
                  </p>
                )}
              </div>
            </fieldset>
          )}
        </Section>

        <Section title="Extras">
          <ul className="space-y-2">
            {addOns.map((a) => {
              const qty = selectedAddOns[a.id] ?? 0;
              return (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <Checkbox
                    label={
                      <>
                        {a.name}{" "}
                        <span className="text-text-muted">
                          {formatMUR(a.priceMur)} {a.priceType === "per_day" ? "per day" : "one-off"}
                        </span>
                      </>
                    }
                    checked={qty > 0}
                    onChange={(e) =>
                      setSelectedAddOns((s) => {
                        const next = { ...s };
                        if (e.target.checked) next[a.id] = 1;
                        else delete next[a.id];
                        return next;
                      })
                    }
                  />
                  {qty > 0 && a.maxQuantity > 1 && (
                    <Select
                      aria-label={`${a.name} quantity`}
                      value={String(qty)}
                      onChange={(e) => setSelectedAddOns((s) => ({ ...s, [a.id]: Number(e.target.value) }))}
                      className="h-8 w-20"
                    >
                      {Array.from({ length: a.maxQuantity }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          × {n}
                        </option>
                      ))}
                    </Select>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Source and status">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-text">Booked via</legend>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => (
                  <label
                    key={s.value}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1.5 text-sm",
                      source === s.value ? "border-primary bg-primary text-white" : "border-admin-border text-text",
                    )}
                  >
                    <input
                      type="radio"
                      name="source"
                      value={s.value}
                      checked={source === s.value}
                      onChange={() => setSource(s.value)}
                      className="sr-only"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as StaffBookingRequest["status"])}
              hint={status === "confirmed" ? "Agreed with the customer." : "Still to be confirmed."}
            >
              <option value="confirmed">Confirmed</option>
              <option value="requested">Requested</option>
            </Select>
            {source === "hotel" && (
              <div className="sm:col-span-2">
                <Select label="Hotel *" value={hotelId ?? ""} onChange={(e) => setHotelId(e.target.value || null)} error={err("hotelId")}>
                  <option value="">Choose the hotel</option>
                  {nearbyHotels.length > 0 && (
                    <optgroup label={`Near ${pickupLocation?.name ?? "pickup"}`}>
                      {nearbyHotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Other hotels">
                    {otherHotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </div>
            )}
          </div>
        </Section>

        <Section title="Price">
          {pricing ? (
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-text">
                    {pricing.days} day{pricing.days === 1 ? "" : "s"} × {formatMUR(pricing.dailyRateMur)}
                  </td>
                  <td className="py-1 text-right text-text">{formatMUR(pricing.carTotalMur)}</td>
                </tr>
                {addOnLines.map(({ addOn, line }) => (
                  <tr key={addOn.id}>
                    <td className="py-1 text-text">
                      {addOn.name}
                      {line.quantity > 1 && ` × ${line.quantity}`}
                    </td>
                    <td className="py-1 text-right text-text">{formatMUR(calculateAddOnTotal([line], pricing.days))}</td>
                  </tr>
                ))}
                <tr className="border-t border-admin-border">
                  <td className="pt-2 font-semibold text-text">Calculated total</td>
                  <td className={cn("pt-2 text-right font-semibold", overrideValue !== null ? "text-text-muted line-through" : "text-text")}>
                    {formatMUR(pricing.totalMur)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-text-muted">Choose a category and valid dates to see the price.</p>
          )}
          <Checkbox
            className="mt-4"
            label="Override the price"
            checked={overriding}
            onChange={(e) => {
              setOverriding(e.target.checked);
              if (e.target.checked && pricing && !overrideTotal) setOverrideTotal(String(pricing.totalMur));
            }}
          />
          {overriding && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Agreed total (Rs) *"
                type="number"
                inputMode="numeric"
                min={0}
                value={overrideTotal}
                onChange={(e) => setOverrideTotal(e.target.value)}
                error={err("overrideTotalMur")}
              />
              <Input
                label="Reason *"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Regular customer discount"
                error={err("overrideReason")}
              />
            </div>
          )}
        </Section>

        <Section title="Internal notes" className="xl:col-span-2">
          <Textarea
            aria-label="Internal notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Visible to staff only."
          />
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-admin-border bg-admin-surface/95 px-6 py-3 shadow-[var(--shadow-lg)] backdrop-blur md:left-60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted">Total</p>
            <p className="text-xl font-semibold text-text">
              {finalTotal !== null ? formatMUR(finalTotal) : "—"}
              {overrideValue !== null && pricing && overrideValue !== pricing.totalMur && (
                <span className="ml-2 text-sm font-normal text-text-muted">
                  (calculated <span className="line-through">{formatMUR(pricing.totalMur)}</span>)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {formError && (
              <p role="alert" className="text-sm text-error">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" loading={submitting} disabled={!pricing}>
              Create booking
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
