import { cn } from "@/lib/cn";

type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, className, id, "aria-describedby": ariaDescribedBy, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label htmlFor={inputId} className="flex flex-col font-label-sm text-label-sm text-on-surface">
      {label && <span>{label}</span>}
      <input
        id={inputId}
        className={cn(
          "mt-1.5 min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface",
          "outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/25 focus:shadow-[0_0_0_4px_rgba(2,36,72,0.08)]",
          error && "border-error focus:border-error focus:ring-error/20",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && <span id={hintId} className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{hint}</span>}
      {error && <span id={errorId} className="mt-1 font-label-sm text-label-sm text-error">{error}</span>}
    </label>
  );
}

type TextareaProps = React.ComponentProps<"textarea"> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({ label, hint, error, className, id, "aria-describedby": ariaDescribedBy, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label htmlFor={inputId} className="flex flex-col font-label-sm text-label-sm text-on-surface">
      {label && <span>{label}</span>}
      <textarea
        id={inputId}
        className={cn(
          "mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-body-md text-on-surface",
          "outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/25 focus:shadow-[0_0_0_4px_rgba(2,36,72,0.08)]",
          error && "border-error focus:border-error focus:ring-error/20",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && <span id={hintId} className="mt-1 font-label-sm text-label-sm text-on-surface-variant">{hint}</span>}
      {error && <span id={errorId} className="mt-1 font-label-sm text-label-sm text-error">{error}</span>}
    </label>
  );
}
