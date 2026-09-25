"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { saveLocationAction } from "@/app/(admin)/admin/locations/actions";
import type { LocationFormValues } from "@/lib/validation";

export type LocationFormLocation = LocationFormValues & { id: string };

const EMPTY: LocationFormValues = {
  name: "",
  slug: "",
  type: "branch",
  region: "",
  address: "",
  latitude: null,
  longitude: null,
  isPickupPoint: true,
  isActive: true,
  openingHours: "Daily, 08:00 – 18:00",
  seoTitle: "",
  seoDescription: "",
  introContent: "",
  driveTimes: [],
  faqs: [],
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function Counter({ value, soft, className }: { value: string; soft: number; className?: string }) {
  return (
    <span className={cn("text-xs", value.length > soft ? "font-medium text-warning-deep" : "text-text-muted", className)}>
      {value.length} / {soft}
      {value.length > soft && " — search engines will cut this short"}
    </span>
  );
}

/** "Edit" / "Add location" button opening the full location form in a drawer. */
export function LocationFormButton({ location }: { location?: LocationFormLocation }) {
  const router = useRouter();
  const editing = !!location;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<LocationFormValues>(location ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismiss = useCallback(() => setToast(null), []);

  const set = <K extends keyof LocationFormValues>(key: K, value: LocationFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== key && !k.startsWith(`${key}.`))));
  };
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));

  function openForm() {
    setValues(location ?? EMPTY);
    setSlugTouched(editing);
    setErrors({});
    setFormError(null);
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveLocationAction(location?.id ?? null, values);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        return;
      }
      setOpen(false);
      setToast({ id: Date.now(), message: r.message, variant: "success" });
      // A new or renamed slug means a new URL for this page.
      if (!editing || r.slug !== location.slug) router.push(`/admin/locations/${r.slug}`);
    });
  }

  const err = (k: string) => errors[k];
  const seoTitle = values.seoTitle ?? "";
  const seoDescription = values.seoDescription ?? "";
  const intro = values.introContent ?? "";

  return (
    <>
      {editing ? (
        <Button variant="secondary" icon={<Pencil className="h-4 w-4" aria-hidden="true" />} onClick={openForm}>
          Edit
        </Button>
      ) : (
        <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openForm}>
          Add location
        </Button>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${location.name}` : "Add location"}
        className="max-w-xl"
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
              <Button type="submit" form="location-form" loading={pending}>
                {editing ? "Save changes" : "Add location"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="location-form" onSubmit={submit} noValidate className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Basics</legend>
            <Input
              label="Name *"
              value={values.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
              error={err("name")}
            />
            <Input
              label="Slug *"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase());
              }}
              className="font-mono"
              error={err("slug")}
              hint={
                editing && values.slug !== location.slug
                  ? `The public page moves to /locations/${values.slug || "…"} — links to the old address will stop working.`
                  : `Public page: /locations/${values.slug || "…"}`
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Type" value={values.type} onChange={(e) => set("type", e.target.value as LocationFormValues["type"])}>
                <option value="branch">Branch</option>
                <option value="airport">Airport</option>
                <option value="hotel">Hotel</option>
                <option value="custom">Other</option>
              </Select>
              <Input label="Region" value={values.region ?? ""} onChange={(e) => set("region", e.target.value)} error={err("region")} />
            </div>
            <Input label="Address" value={values.address ?? ""} onChange={(e) => set("address", e.target.value)} error={err("address")} />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="number"
                step="0.0001"
                value={values.latitude ?? ""}
                onChange={(e) => set("latitude", num(e.target.value))}
                error={err("latitude")}
                hint="e.g. -20.0181"
              />
              <Input
                label="Longitude"
                type="number"
                step="0.0001"
                value={values.longitude ?? ""}
                onChange={(e) => set("longitude", num(e.target.value))}
                error={err("longitude")}
                hint="e.g. 57.5807"
              />
            </div>
            <Input
              label="Opening hours"
              value={values.openingHours ?? ""}
              onChange={(e) => set("openingHours", e.target.value)}
              error={err("openingHours")}
            />
            <div className="space-y-2">
              <Checkbox
                label="Customers can pick up here"
                checked={values.isPickupPoint}
                onChange={(e) => set("isPickupPoint", e.target.checked)}
              />
              <Checkbox
                label="Show on the website"
                hint={!values.isActive ? "Hidden: the public page and search results won't list it." : undefined}
                checked={values.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Public page</legend>
            <div>
              <Input label="SEO title" value={seoTitle} onChange={(e) => set("seoTitle", e.target.value)} error={err("seoTitle")} />
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-text-muted">
                  <code className="font-mono">{"{from_price}"}</code> shows the current cheapest daily rate.
                </span>
                <Counter value={seoTitle} soft={60} />
              </div>
            </div>
            <div>
              <Textarea
                label="Meta description"
                rows={3}
                value={seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
                error={err("seoDescription")}
              />
              <Counter value={seoDescription} soft={160} className="mt-1 block text-right" />
            </div>
            <div>
              <Textarea
                label="Intro — “Renting a car in …”"
                rows={8}
                value={intro}
                onChange={(e) => set("introContent", e.target.value)}
                error={err("introContent")}
              />
              <span className="mt-1 block text-right text-xs text-text-muted">
                {intro.trim() ? intro.trim().split(/\s+/).length : 0} words · aim for about 150
              </span>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Getting around</legend>
            {values.driveTimes.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    aria-label={`Place ${i + 1}`}
                    placeholder="Port Louis"
                    value={d.place}
                    onChange={(e) => set("driveTimes", values.driveTimes.map((x, j) => (j === i ? { ...x, place: e.target.value } : x)))}
                    error={err(`driveTimes.${i}.place`)}
                  />
                </div>
                <div className="w-28">
                  <Input
                    aria-label={`Minutes to place ${i + 1}`}
                    type="number"
                    min={1}
                    suffix="min"
                    value={Number.isNaN(d.minutes) ? "" : d.minutes}
                    onChange={(e) =>
                      set("driveTimes", values.driveTimes.map((x, j) => (j === i ? { ...x, minutes: Number.parseInt(e.target.value, 10) } : x)))
                    }
                    error={err(`driveTimes.${i}.minutes`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  aria-label={`Remove ${d.place || `place ${i + 1}`}`}
                  onClick={() => set("driveTimes", values.driveTimes.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => set("driveTimes", [...values.driveTimes, { place: "", minutes: 30 }])}
              disabled={values.driveTimes.length >= 10}
            >
              Add place
            </Button>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">Local questions</legend>
            {values.faqs.map((f, i) => (
              <div key={i} className="space-y-2 rounded-[var(--radius-md)] border border-admin-border p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      aria-label={`Question ${i + 1}`}
                      placeholder="Is parking easy here?"
                      value={f.question}
                      onChange={(e) => set("faqs", values.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
                      error={err(`faqs.${i}.question`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    aria-label={`Remove question ${i + 1}`}
                    onClick={() => set("faqs", values.faqs.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Textarea
                  aria-label={`Answer ${i + 1}`}
                  rows={2}
                  value={f.answer}
                  onChange={(e) => set("faqs", values.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
                  error={err(`faqs.${i}.answer`)}
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={<Plus className="h-4 w-4" aria-hidden="true" />}
              onClick={() => set("faqs", [...values.faqs, { question: "", answer: "" }])}
              disabled={values.faqs.length >= 10}
            >
              Add question
            </Button>
          </fieldset>
        </form>
      </Drawer>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
