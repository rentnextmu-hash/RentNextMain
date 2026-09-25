"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { Car, Check, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/components/ui/useToast";
import { CLASS_LABEL } from "@/components/public/CarCard";
import { cn } from "@/lib/utils";
import { saveCategoryAction, saveCategoryRatesAction } from "@/app/(admin)/admin/settings/actions";
import type { CategoryFormValues } from "@/lib/validation";
import type { VehicleCategoryClass } from "@/types/enums";

export type SettingsCategory = {
  id: string;
  slug: string;
  name: string;
  category: VehicleCategoryClass;
  tagline: string | null;
  bestFor: string | null;
  description: string | null;
  transmission: string;
  fuelType: string;
  seats: number;
  doors: number;
  luggageCapacity: number | null;
  airConditioning: boolean;
  rate12: number;
  rate35: number;
  rate6: number;
  isActive: boolean;
  imagePath: string | null;
};

function RateCell({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <input
      type="number"
      min={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 w-24 rounded-[var(--radius-sm)] border bg-surface px-2 text-right text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary",
        invalid ? "border-error" : "border-border",
      )}
      aria-label="Rate"
    />
  );
}

function CategoryRow({
  category,
  onEdit,
  onSaved,
}: {
  category: SettingsCategory;
  onEdit: () => void;
  onSaved: (message: string) => void;
}) {
  const [rates, setRates] = useState({ rate12: String(category.rate12), rate35: String(category.rate35), rate6: String(category.rate6) });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty = rates.rate12 !== String(category.rate12) || rates.rate35 !== String(category.rate35) || rates.rate6 !== String(category.rate6);
  const nums = { r12: Number(rates.rate12), r35: Number(rates.rate35), r6: Number(rates.rate6) };
  const valid = nums.r12 > 0 && nums.r35 > 0 && nums.r6 > 0 && nums.r12 >= nums.r35 && nums.r35 >= nums.r6;
  const orderBad = dirty && !valid;

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await saveCategoryRatesAction(category.id, { rate12: nums.r12, rate35: nums.r35, rate6: nums.r6 });
      if (r.ok) onSaved(r.message);
      else setError(r.error);
    });
  }

  return (
    <tr className="border-b border-admin-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative hidden h-9 w-14 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-alt sm:flex">
            {category.imagePath ? (
              <Image src={category.imagePath} alt="" fill sizes="56px" className="object-contain p-1" />
            ) : (
              <Car className="h-5 w-5 text-primary/30" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="font-medium text-text">{category.name}</p>
            <p className="text-xs text-text-muted">{CLASS_LABEL[category.category] ?? category.category}</p>
          </div>
        </div>
      </td>
      <td className="px-2 py-3 text-right"><RateCell value={rates.rate12} onChange={(v) => setRates((s) => ({ ...s, rate12: v }))} invalid={orderBad} /></td>
      <td className="px-2 py-3 text-right"><RateCell value={rates.rate35} onChange={(v) => setRates((s) => ({ ...s, rate35: v }))} invalid={orderBad} /></td>
      <td className="px-2 py-3 text-right"><RateCell value={rates.rate6} onChange={(v) => setRates((s) => ({ ...s, rate6: v }))} invalid={orderBad} /></td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {error ? (
            <span className="text-xs text-error">{error}</span>
          ) : dirty ? (
            <Button size="sm" loading={pending} disabled={orderBad} onClick={save}>
              <Check className="h-4 w-4" aria-hidden="true" /> Save
            </Button>
          ) : (
            !category.isActive && <Badge variant="warning">Hidden</Badge>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${category.name}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function EditDrawer({ category, onClose }: { category: SettingsCategory; onClose: (saved?: string) => void }) {
  const [v, setV] = useState<CategoryFormValues>({
    name: category.name,
    tagline: category.tagline ?? "",
    bestFor: category.bestFor ?? "",
    description: category.description ?? "",
    transmission: category.transmission as "automatic" | "manual",
    fuelType: category.fuelType as "petrol" | "diesel" | "hybrid" | "electric",
    seats: category.seats,
    doors: category.doors,
    luggageCapacity: category.luggageCapacity,
    airConditioning: category.airConditioning,
    rate12: category.rate12,
    rate35: category.rate35,
    rate6: category.rate6,
    imagePath: category.imagePath ?? "",
    isActive: category.isActive,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof CategoryFormValues>(k: K, val: CategoryFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)));
  };
  const err = (k: string) => errors[k];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveCategoryAction(category.id, v);
      if (r.ok) onClose(r.message);
      else {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
      }
    });
  }

  return (
    <Drawer
      open
      onClose={() => onClose()}
      title={`Edit ${category.name}`}
      description="Changes show on the website within seconds."
      footer={
        <div className="flex items-center justify-between gap-3">
          {formError ? <p role="alert" className="text-sm text-error">{formError}</p> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onClose()}>Cancel</Button>
            <Button type="submit" form="category-form" loading={pending}>Save changes</Button>
          </div>
        </div>
      }
    >
      <form id="category-form" onSubmit={submit} noValidate className="space-y-4">
        <Input label="Name" value={v.name} onChange={(e) => set("name", e.target.value)} error={err("name")} />
        <Input label="Tagline" value={v.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} error={err("tagline")} />
        <Input label="Best for" value={v.bestFor ?? ""} onChange={(e) => set("bestFor", e.target.value)} error={err("bestFor")} />
        <Textarea label="Description" rows={4} value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} error={err("description")} />
        <ImageUpload
          bucket="vehicles"
          label="Photo"
          value={v.imagePath || null}
          onChange={(url) => set("imagePath", url ?? "")}
          hint="A clean cutout on a plain background works best. Shown across the site."
        />
        <div className="grid grid-cols-3 gap-3">
          <Input label="1–2 days (Rs)" type="number" value={v.rate12} onChange={(e) => set("rate12", Number(e.target.value))} error={err("rate12")} />
          <Input label="3–5 days" type="number" value={v.rate35} onChange={(e) => set("rate35", Number(e.target.value))} error={err("rate35")} />
          <Input label="6+ days" type="number" value={v.rate6} onChange={(e) => set("rate6", Number(e.target.value))} error={err("rate6")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Transmission" value={v.transmission} onChange={(e) => set("transmission", e.target.value as "automatic" | "manual")}>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </Select>
          <Select label="Fuel" value={v.fuelType} onChange={(e) => set("fuelType", e.target.value as CategoryFormValues["fuelType"])}>
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="hybrid">Hybrid</option>
            <option value="electric">Electric</option>
          </Select>
          <Input label="Seats" type="number" value={v.seats} onChange={(e) => set("seats", Number(e.target.value))} error={err("seats")} />
          <Input label="Doors" type="number" value={v.doors} onChange={(e) => set("doors", Number(e.target.value))} error={err("doors")} />
          <Input label="Luggage (bags)" type="number" value={v.luggageCapacity ?? ""} onChange={(e) => set("luggageCapacity", e.target.value === "" ? null : Number(e.target.value))} error={err("luggageCapacity")} />
        </div>
        <Checkbox label="Air conditioning" checked={v.airConditioning} onChange={(e) => set("airConditioning", e.target.checked)} />
        <Checkbox label="Show on the website" hint={!v.isActive ? "Hidden from the fleet and search." : undefined} checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
      </form>
    </Drawer>
  );
}

export function CategorySettings({ categories }: { categories: SettingsCategory[] }) {
  const [editing, setEditing] = useState<SettingsCategory | null>(null);
  const { toast, show, dismiss } = useToast();

  return (
    <section className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface">
      <div className="border-b border-admin-border p-5">
        <h3 className="text-base font-semibold text-text">Vehicle rates &amp; details</h3>
        <p className="mt-1 text-sm text-text-muted">Edit a rate inline, or open a car for its full details. Rates fall the longer the rental.</p>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-admin-border bg-surface-alt text-text-muted">
              <th className="px-4 py-3 font-medium">Car</th>
              <th className="px-2 py-3 text-right font-medium">1–2 days</th>
              <th className="px-2 py-3 text-right font-medium">3–5 days</th>
              <th className="px-2 py-3 text-right font-medium">6+ days</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} onEdit={() => setEditing(cat)} onSaved={show} />
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <EditDrawer
          category={editing}
          onClose={(saved) => {
            setEditing(null);
            if (saved) show(saved);
          }}
        />
      )}
      <Toast toast={toast} onDismiss={dismiss} />
    </section>
  );
}
