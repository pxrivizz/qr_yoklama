import { cn } from "@/lib/cn";

const variants = {
  primary:
    "rounded-lg bg-primary text-on-primary font-medium hover:bg-primary-container transition-colors shadow-none",
  secondary:
    "rounded-lg border border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-none",
  ghost:
    "rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors",
  danger:
    "rounded-md text-error hover:text-error hover:bg-error-container/40 transition-colors",
  critical:
    "rounded-xl bg-error text-on-error font-medium hover:bg-on-error-container transition-colors shadow-none",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-xs font-medium",
  md: "px-4 py-2 text-sm font-medium",
  lg: "px-5 py-2.5 text-sm font-medium",
} as const;

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center font-label-sm btn-lift press-scale",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}

type ButtonLinkProps = React.ComponentProps<"a"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={cn(
        "inline-flex min-h-10 items-center justify-center font-label-sm btn-lift press-scale",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
