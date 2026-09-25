"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/components/ui/useToast";
import { formatMUR } from "@/lib/format";
import { saveAddOnAction } from "@/app/(admin)/admin/settings/actions";
import type { AddOnFormValues } from "@/lib/validation";

export type SettingsAddOn = {
  id: string;
  name: string;
  description: string | null;
  priceMur: number;
  priceType: "per_day" | "per_booking";
  maxQuantity: number;
  isActive: boolean;
};

const EMPTY: AddOnFormValues = { name: "", description: "", priceMur: 0, priceType: "per_booking", maxQuantity: 1, isActive: true };

function AddOnDrawer({ addOn, onClose }: { addOn: SettingsAddOn | null; onClose: (saved?: string) => void }) {
  const editing = !!addOn;
  const [v, setV] = useState<AddOnFormValues>(
    addOn
      ? { name: addOn.name, description: addOn.description ?? "", priceMur: addOn.priceMur, priceType: addOn.priceType, maxQuantity: addOn.maxQuantity, isActive: addOn.isActive }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof AddOnFormValues>(k: K, val: AddOnFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => key !== k)));
  };
  const err = (k: string) => errors[k];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveAddOnAction(addOn?.id ?? null, v);
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
      title={editing ? `Edit ${addOn.name}` : "Add extra"}
      className="max-w-md"
      footer={
        <div className="flex items-center justify-between gap-3">
          {formError ? <p role="alert" className="text-sm text-error">{formError}</p> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onClose()}>Cancel</Button>
            <Button type="submit" form="addon-form" loading={pending}>{editing ? "Save changes" : "Add extra"}</Button>
          </div>
        </div>
      }
    >
      <form id="addon-form" onSubmit={submit} noValidate className="space-y-4">
        <Input label="Name" value={v.name} onChange={(e) => set("name", e.target.value)} error={err("name")} />
        <Textarea label="Description" rows={2} value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} error={err("description")} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Price (Rs)" type="number" min={0} value={v.priceMur} onChange={(e) => set("priceMur", Number(e.target.value))} error={err("priceMur")} />
          <Select label="Charged" value={v.priceType} onChange={(e) => set("priceType", e.target.value as AddOnFormValues["priceType"])}>
            <option value="per_booking">Once per booking</option>
            <option value="per_day">Per day</option>
          </Select>
        </div>
        <Input label="Max quantity" type="number" min={1} max={10} value={v.maxQuantity} onChange={(e) => set("maxQuantity", Number(e.target.value))} error={err("maxQuantity")} hint="1 means a simple yes/no; higher lets customers pick a number (e.g. baby seats)." />
        <Checkbox label="Offered on the website" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} />
      </form>
    </Drawer>
  );
}

export function AddOnSettings({ addOns }: { addOns: SettingsAddOn[] }) {
  const [drawer, setDrawer] = useState<{ mode: "add" } | { mode: "edit"; addOn: SettingsAddOn } | null>(null);
  const { toast, show, dismiss } = useToast();

  return (
    <section className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface">
      <div className="flex items-center justify-between gap-3 border-b border-admin-border p-5">
        <div>
          <h3 className="text-base font-semibold text-text">Extras</h3>
          <p className="mt-1 text-sm text-text-muted">Optional add-ons offered during booking.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setDrawer({ mode: "add" })}>
          Add extra
        </Button>
      </div>
      <ul className="divide-y divide-admin-border">
        {addOns.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div>
              <p className="flex items-center gap-2 font-medium text-text">
                {a.name}
                {!a.isActive && <Badge variant="warning">Hidden</Badge>}
              </p>
              {a.description && <p className="text-sm text-text-muted">{a.description}</p>}
            </div>
            <div className="flex items-center gap-4">
              <span className="whitespace-nowrap text-sm text-text">
                {formatMUR(a.priceMur)} <span className="text-text-muted">{a.priceType === "per_day" ? "/ day" : "one-off"}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setDrawer({ mode: "edit", addOn: a })} aria-label={`Edit ${a.name}`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {drawer && (
        <AddOnDrawer
          addOn={drawer.mode === "edit" ? drawer.addOn : null}
          onClose={(saved) => {
            setDrawer(null);
            if (saved) show(saved);
          }}
        />
      )}
      <Toast toast={toast} onDismiss={dismiss} />
    </section>
  );
}
