"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Pencil, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import {
  changeVehicleStatusAction,
  createVehicleAction,
  suggestVehicleCodeAction,
  updateVehicleAction,
  type VehicleFormResult,
} from "@/app/(admin)/admin/fleet/actions";
import type { VehicleStatus } from "@/types/enums";

export type VehicleFormVehicle = {
  id: string;
  categoryId: string;
  code: string;
  registration: string;
  locationId: string;
  status: string;
  mileageKm: number;
  year: number | null;
  colour: string | null;
  acquiredAt: string | null;
  notes: string | null;
};

type Option = { id: string; name: string };

export const VEHICLE_STATUS_OPTIONS: { value: VehicleStatus; label: string; hint: string }[] = [
  { value: "available", label: "Available", hint: "Ready to rent." },
  { value: "booked", label: "Booked", hint: "Normally set automatically when a car is assigned or picked up." },
  { value: "maintenance", label: "Maintenance", hint: "Off the road — never offered for bookings." },
  { value: "inactive", label: "Inactive", hint: "Retired or sold — hidden from availability." },
];

function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const show = (message: string, variant: ToastMessage["variant"] = "success") =>
    setToast({ id: Date.now(), message, variant });
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}

/** "+ Add vehicle" / "Edit" button that opens the vehicle form in a drawer. */
export function VehicleFormButton({
  vehicle,
  categories,
  locations,
}: {
  vehicle?: VehicleFormVehicle;
  categories: Option[];
  locations: Option[];
}) {
  const editing = !!vehicle;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<VehicleFormResult | null>(null);
  const { toast, show, dismiss } = useToast();

  const [categoryId, setCategoryId] = useState(vehicle?.categoryId ?? "");
  const [code, setCode] = useState(vehicle?.code ?? "");
  const [suggesting, setSuggesting] = useState(false);
  // Once staff type their own code, stop overwriting it with suggestions.
  const codeTouched = useRef(editing);
  const formRef = useRef<HTMLFormElement>(null);

  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};

  async function suggest(forCategory: string) {
    if (!forCategory) return;
    setSuggesting(true);
    const suggestion = await suggestVehicleCodeAction(forCategory);
    setSuggesting(false);
    if (suggestion) setCode(suggestion);
  }

  function openForm() {
    setResult(null);
    if (!editing) {
      setCategoryId("");
      setCode("");
      codeTouched.current = false;
    }
    setOpen(true);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = editing ? await updateVehicleAction(vehicle.id, formData) : await createVehicleAction(formData);
      setResult(r);
      if (r.ok) {
        setOpen(false);
        show(r.message);
      } else if (r.fieldErrors) {
        requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      }
    });
  }

  return (
    <>
      {editing ? (
        <Button variant="secondary" icon={<Pencil className="h-4 w-4" aria-hidden="true" />} onClick={openForm}>
          Edit
        </Button>
      ) : (
        <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openForm}>
          Add vehicle
        </Button>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${vehicle.code}` : "Add vehicle"}
        description={editing ? undefined : "The car is bookable as soon as it's saved as available."}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="vehicle-form" loading={pending}>
              {editing ? "Save changes" : "Add vehicle"}
            </Button>
          </div>
        }
      >
        <form
          id="vehicle-form"
          ref={formRef}
          // onSubmit rather than action={}: React 19 resets a form after an
          // action runs, which would wipe the fields on a validation error.
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          noValidate
          className="space-y-4"
        >
          {result && !result.ok && (
            <p role="alert" className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-sm text-error">
              {result.error}
            </p>
          )}
          <Select
            name="categoryId"
            label="Category *"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              if (!codeTouched.current) suggest(e.target.value);
            }}
            error={errors.categoryId}
            required
          >
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            name="registration"
            label="Registration *"
            defaultValue={vehicle?.registration}
            placeholder="1101 GB 23"
            className="font-mono uppercase"
            error={errors.registration}
            required
          />
          <div>
            <Input
              name="code"
              label="Vehicle code *"
              value={code}
              onChange={(e) => {
                codeTouched.current = true;
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="VITZ-004"
              className="font-mono"
              hint={editing ? undefined : "Suggested from the category — change it if you use a different scheme."}
              error={errors.code}
              required
            />
            {!editing && categoryId && (
              <button
                type="button"
                onClick={() => {
                  codeTouched.current = false;
                  suggest(categoryId);
                }}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <RefreshCw className={suggesting ? "h-3 w-3 animate-spin" : "h-3 w-3"} aria-hidden="true" />
                Suggest next free code
              </button>
            )}
          </div>
          <Select
            name="locationId"
            label="Location *"
            defaultValue={vehicle?.locationId ?? ""}
            error={errors.locationId}
            required
          >
            <option value="">Choose a location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select name="status" label="Status" defaultValue={vehicle?.status ?? "available"} error={errors.status}>
            {VEHICLE_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="mileageKm"
              label="Mileage (km) *"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={vehicle?.mileageKm}
              error={errors.mileageKm}
              required
            />
            <Input
              name="year"
              label="Year"
              type="number"
              inputMode="numeric"
              defaultValue={vehicle?.year ?? undefined}
              error={errors.year}
            />
            <Input name="colour" label="Colour" defaultValue={vehicle?.colour ?? undefined} error={errors.colour} />
            <Input
              name="acquiredAt"
              label="Acquired"
              type="date"
              defaultValue={vehicle?.acquiredAt ?? undefined}
              error={errors.acquiredAt}
            />
          </div>
          <Textarea name="notes" label="Notes" defaultValue={vehicle?.notes ?? undefined} rows={3} error={errors.notes} />
        </form>
      </Drawer>

      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}

/** "Change status" button with a small dialog. Warns when an open booking still holds the car. */
export function ChangeStatusButton({
  vehicleId,
  code,
  currentStatus,
  openBookingReference,
}: {
  vehicleId: string;
  code: string;
  currentStatus: string;
  openBookingReference: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast, show, dismiss } = useToast();
  const hint = VEHICLE_STATUS_OPTIONS.find((s) => s.value === status)?.hint;

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setStatus(currentStatus);
          setError(null);
          setOpen(true);
        }}
      >
        Change status
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Change status of ${code}`}>
        <div className="space-y-4">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} hint={hint}>
            {VEHICLE_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          {openBookingReference && (status === "maintenance" || status === "inactive") && (
            <p className="rounded-[var(--radius-md)] bg-warning/10 px-3 py-2 text-sm text-warning-deep">
              {code} is still assigned to booking {openBookingReference}. Reassign that booking to another car.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-[var(--radius-md)] bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={status === currentStatus}
              onClick={() =>
                startTransition(async () => {
                  const r = await changeVehicleStatusAction(vehicleId, status);
                  if (r.ok) {
                    setOpen(false);
                    show(r.message);
                  } else setError(r.error);
                })
              }
            >
              Save status
            </Button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
