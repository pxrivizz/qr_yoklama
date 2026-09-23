import { cn } from "@/lib/cn";

const variants = {
  default: "border border-neutral-200 bg-neutral-100 text-neutral-800",
  info: "border border-blue-200 bg-blue-50 text-blue-800",
  code: "border border-neutral-200/90 bg-neutral-100/80 font-mono text-neutral-800",
  live: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border border-amber-200 bg-amber-50 text-amber-800",
  error: "border border-red-200 bg-red-50 text-red-800",
  critical: "border border-red-200 bg-red-50 text-red-800",
} as const;

type BadgeProps = {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
};

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 font-label-sm text-[11px] font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

type StatusDotBadgeProps = {
  label: string;
  className?: string;
};

export function StatusDotBadge({
  label,
  className,
}: StatusDotBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-label-sm text-[11px] font-medium text-neutral-800",
        className,
      )}
    >
      {label}
    </span>
  );
}
