"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { uploadInspectionPhoto } from "@/lib/storage";
import { FUEL_LEVELS, MAX_INSPECTION_PHOTOS } from "@/lib/inspections";
import { recordInspection } from "@/app/(admin)/admin/bookings/[reference]/actions";
import {
  ActionFeedback,
  useBookingAction,
  type ActionBooking,
} from "@/components/admin/bookings/bookingActionUtils";
import type { InspectionKind } from "@/types/enums";

type Photo = { path: string; preview: string };

export function InspectionDialog({
  booking,
  kind,
  open,
  onClose,
  onDone,
}: {
  booking: ActionBooking;
  kind: InspectionKind;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { pending, result, run } = useBookingAction();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isCheckout = kind === "checkout";
  const odometer = booking.vehicleMileageKm ?? 0;

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const room = MAX_INSPECTION_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, room);
    const supabase = createClient();
    for (const file of chosen) {
      setUploading((n) => n + 1);
      try {
        const path = await uploadInspectionPhoto(supabase, booking.id, file);
        setPhotos((prev) => [...prev, { path, preview: URL.createObjectURL(file) }]);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "That photo couldn't be uploaded.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function removePhoto(path: string) {
    setPhotos((prev) => prev.filter((p) => p.path !== path));
    // Best-effort cleanup of the just-uploaded object; ignore failures.
    createClient().storage.from("inspections").remove([path]).catch(() => {});
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    run(
      () =>
        recordInspection(booking.id, {
          kind,
          mileageKm: form.get("mileageKm"),
          fuelLevel: form.get("fuelLevel"),
          exteriorNotes: (form.get("exteriorNotes") as string) || undefined,
          photos: photos.map((p) => p.path),
        }),
      () => {
        setPhotos([]);
        onDone();
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isCheckout ? `Check out ${booking.vehicleCode ?? "the vehicle"}` : `Check in ${booking.vehicleCode ?? "the vehicle"}`}
      description={
        isCheckout
          ? "Record the car's condition at handover. This marks the rental active."
          : "Record the car's condition on return. This completes the rental and frees the car."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="mileageKm"
            label="Mileage (km)"
            type="number"
            inputMode="numeric"
            min={isCheckout ? 0 : odometer}
            defaultValue={odometer || undefined}
            hint={isCheckout ? undefined : `Must be ≥ ${odometer.toLocaleString("en-US")} km`}
            required
            autoFocus
          />
          <Select name="fuelLevel" label="Fuel level" defaultValue="full" required>
            {FUEL_LEVELS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          name="exteriorNotes"
          label="Condition notes"
          rows={3}
          placeholder={isCheckout ? "Any existing scratches, dents or marks…" : "Any new damage, missing items or fuel shortfall…"}
        />

        <div>
          <span className="text-sm font-medium text-text">Photos</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {photos.map((p) => (
              <div key={p.path} className="relative h-20 w-20 overflow-hidden rounded-[var(--radius-md)] border border-admin-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="Inspection photo" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(p.path)}
                  aria-label="Remove photo"
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {photos.length < MAX_INSPECTION_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-admin-border text-text-muted hover:border-primary hover:text-primary"
              >
                {uploading > 0 ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <span className="text-xs">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          {uploadError && <p className="mt-1 text-xs text-error">{uploadError}</p>}
        </div>

        {result && !result.ok && <ActionFeedback result={result} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} disabled={pending || uploading > 0}>
            {isCheckout ? "Check out & activate" : "Check in & complete"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
