import { cn } from "@/lib/cn";

type LiveIndicatorProps = {
  className?: string;
  label?: string;
};

export function LiveIndicator({ className, label = "Canlı" }: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-xs font-medium text-neutral-800",
        className,
      )}
      role="status"
    >
      {label}
    </span>
  );
}
