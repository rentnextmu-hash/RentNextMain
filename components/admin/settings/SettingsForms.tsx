"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/components/ui/useToast";
import { saveSettingsAction } from "@/app/(admin)/admin/settings/actions";
import type { AdminSettings } from "@/lib/queries/settings";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-6">
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Company and Booking settings, saved together. Owner only. */
export function SettingsForms({ settings }: { settings: AdminSettings }) {
  const [company, setCompany] = useState(settings.company);
  const [booking, setBooking] = useState(settings.booking);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { toast, show, dismiss } = useToast();

  const c = <K extends keyof typeof company>(key: K, value: (typeof company)[K]) => {
    setCompany((s) => ({ ...s, [key]: value }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== `company.${key}`)));
  };
  const b = <K extends keyof typeof booking>(key: K, value: (typeof booking)[K]) => {
    setBooking((s) => ({ ...s, [key]: value }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== `booking.${key}`)));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const r = await saveSettingsAction({ company, booking });
      if (r.ok) {
        show(r.message);
        setErrors({});
      } else {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
      }
    });
  }

  const err = (k: string) => errors[k];

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Section title="Company" description="Shown across the website — footer, contact page and confirmation emails.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Company name" value={company.company_name} onChange={(e) => c("company_name", e.target.value)} error={err("company.company_name")} />
          <Input label="Tagline" value={company.company_tagline} onChange={(e) => c("company_tagline", e.target.value)} error={err("company.company_tagline")} />
          <Input label="Public email" type="email" value={company.company_email} onChange={(e) => c("company_email", e.target.value)} error={err("company.company_email")} />
          <Input label="Phone" value={company.company_phone} onChange={(e) => c("company_phone", e.target.value)} error={err("company.company_phone")} placeholder="+230 5500 1415" />
          <Input label="WhatsApp number" value={company.company_whatsapp} onChange={(e) => c("company_whatsapp", e.target.value)} error={err("company.company_whatsapp")} />
          <Input label="Website" value={company.company_website} onChange={(e) => c("company_website", e.target.value)} error={err("company.company_website")} />
          <div className="sm:col-span-2">
            <Textarea label="Address" rows={2} value={company.company_address} onChange={(e) => c("company_address", e.target.value)} error={err("company.company_address")} />
          </div>
        </div>
      </Section>

      <Section title="Booking" description="Defaults and policies for new bookings.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Default pickup time" value={booking.default_pickup_time} onChange={(e) => b("default_pickup_time", e.target.value)} error={err("booking.default_pickup_time")} placeholder="10:00" />
          <Input label="Default return time" value={booking.default_return_time} onChange={(e) => b("default_return_time", e.target.value)} error={err("booking.default_return_time")} placeholder="10:00" />
          <Input label="Minimum rental (days)" type="number" min={1} value={booking.minimum_rental_days} onChange={(e) => b("minimum_rental_days", Number(e.target.value))} error={err("booking.minimum_rental_days")} />
          <Input label="Book up to (days ahead)" type="number" min={1} value={booking.advance_booking_days} onChange={(e) => b("advance_booking_days", Number(e.target.value))} error={err("booking.advance_booking_days")} />
          <Input label="Free cancellation (hours before)" type="number" min={0} value={booking.cancellation_hours} onChange={(e) => b("cancellation_hours", Number(e.target.value))} error={err("booking.cancellation_hours")} hint="Shown on the confirmation page." />
          <Input label="Booking notifications to" type="email" value={booking.booking_email} onChange={(e) => b("booking_email", e.target.value)} error={err("booking.booking_email")} hint="New booking emails go here." />
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3">
        {formError && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" loading={pending}>
          Save settings
        </Button>
      </div>
      <Toast toast={toast} onDismiss={dismiss} />
    </form>
  );
}
