import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, rows = 4, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        className={cn(
          "w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          error && "border-error focus:ring-error focus:border-error",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${textareaId}-error`} className="text-sm text-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${textareaId}-hint`} className="text-sm text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
