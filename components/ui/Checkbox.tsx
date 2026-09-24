import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  hint?: string;
  error?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, error, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border-border accent-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed",
          )}
          {...props}
        />
        <label htmlFor={inputId} className="cursor-pointer text-sm text-text">
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="pl-7 text-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="pl-7 text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
