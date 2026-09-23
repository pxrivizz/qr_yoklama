import { cn } from "@/lib/cn";

const variants = {
  primary:
    "rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 transition-colors shadow-none",
  secondary:
    "rounded-lg border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 transition-colors shadow-none",
  ghost:
    "rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors",
  danger:
    "rounded-md text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors",
  critical:
    "rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-none",
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
