import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3 text-text-muted">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm text-text",
            "placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            error && "border-error focus:ring-error focus:border-error",
            prefix && "pl-9",
            suffix && "pr-9",
            className,
          )}
          {...props}
        />
        {suffix && <span className="pointer-events-none absolute right-3 text-text-muted">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
