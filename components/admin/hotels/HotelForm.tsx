"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { saveHotelAction } from "@/app/(admin)/admin/hotels/actions";
import type { HotelFormValues } from "@/lib/validation";

export type HotelFormHotel = HotelFormValues & { id: string };

const EMPTY: HotelFormValues = {
  name: "",
  slug: "",
  locationId: null,
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contractStatus: "pending",
  contractStartDate: "",
  commissionRate: 10,
  pickupNotes: "",
  isActive: true,
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** "Add hotel" / "Edit" button with the hotel partner form in a drawer. */
export function HotelFormButton({ hotel, locations }: { hotel?: HotelFormHotel; locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const editing = !!hotel;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<HotelFormValues>(hotel ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismiss = useCallback(() => setToast(null), []);

  const set = <K extends keyof HotelFormValues>(key: K, value: HotelFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveHotelAction(hotel?.id ?? null, values);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        return;
      }
      setOpen(false);
      setToast({ id: Date.now(), message: r.message, variant: "success" });
      if (!editing || r.slug !== hotel.slug) router.push(`/admin/hotels/${r.slug}`);
    });
  }

  return (
    <>
      {editing ? (
        <Button
          variant="secondary"
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            setValues(hotel);
            setErrors({});
            setFormError(null);
            setOpen(true);
          }}
        >
          Edit
        </Button>
      ) : (
        <Button
          icon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={() => {
            setValues(EMPTY);
            setSlugTouched(false);
            setErrors({});
            setFormError(null);
            setOpen(true);
          }}
        >
          Add hotel
        </Button>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${hotel.name}` : "Add hotel partner"}
        footer={
          <div className="flex items-center justify-between gap-3">
            {formError ? (
              <p role="alert" className="text-sm text-error">
                {formError}
              </p>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="hotel-form" loading={pending}>
                {editing ? "Save changes" : "Add hotel"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="hotel-form" onSubmit={submit} noValidate className="space-y-4">
          <Input
            label="Hotel name *"
            value={values.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            error={errors.name}
          />
          <Input
            label="Slug *"
            className="font-mono"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value.toLowerCase());
            }}
            error={errors.slug}
          />
          <Select
            label="Nearest location"
            value={values.locationId ?? ""}
            onChange={(e) => set("locationId", e.target.value || null)}
            error={errors.locationId}
            hint="Its public page lists this hotel for delivery."
          >
            <option value="">None</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Contract"
              value={values.contractStatus}
              onChange={(e) => set("contractStatus", e.target.value as HotelFormValues["contractStatus"])}
              hint={values.contractStatus === "active" ? "Offered for delivery on the website." : "Not offered on the website."}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Input
              label="Contract start"
              type="date"
              value={values.contractStartDate ?? ""}
              onChange={(e) => set("contractStartDate", e.target.value)}
              error={errors.contractStartDate}
            />
          </div>
          <Input
            label="Commission *"
            type="number"
            step="0.5"
            min={0}
            max={50}
            suffix="%"
            value={Number.isNaN(values.commissionRate) ? "" : values.commissionRate}
            onChange={(e) => set("commissionRate", e.target.value === "" ? Number.NaN : Number(e.target.value))}
            error={errors.commissionRate}
            hint="On bookings the hotel refers."
          />
          <fieldset className="space-y-3 border-t border-admin-border pt-4">
            <legend className="text-sm font-semibold text-text">Contact</legend>
            <Input label="Name" value={values.contactName ?? ""} onChange={(e) => set("contactName", e.target.value)} error={errors.contactName} />
            <Input
              label="Email"
              type="email"
              value={values.contactEmail ?? ""}
              onChange={(e) => set("contactEmail", e.target.value)}
              error={errors.contactEmail}
            />
            <Input
              label="Phone"
              type="tel"
              value={values.contactPhone ?? ""}
              onChange={(e) => set("contactPhone", e.target.value)}
              error={errors.contactPhone}
              placeholder="+230 263 8800"
            />
          </fieldset>
          <Textarea
            label="Pickup arrangements"
            rows={3}
            value={values.pickupNotes ?? ""}
            onChange={(e) => set("pickupNotes", e.target.value)}
            error={errors.pickupNotes}
            placeholder="Where the handover happens, who to ask for…"
          />
          <Checkbox label="Partnership active" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        </form>
      </Drawer>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
