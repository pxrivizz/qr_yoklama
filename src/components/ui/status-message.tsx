import { cn } from "@/lib/cn";

const variants = {
  info: "border-outline-variant bg-surface-container text-on-surface",
  success: "border-secondary/30 bg-secondary/5 text-secondary",
  error: "border-error/30 bg-error/5 text-error",
  warning: "border-error-container bg-error-container/30 text-on-error-container",
} as const;

type StatusMessageProps = {
  variant?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function StatusMessage({
  variant = "info",
  title,
  children,
  className,
}: StatusMessageProps) {
  return (
    <div
      className={cn("animate-fade-in-up status-accent-bar rounded-lg border px-4 py-3 font-body-md text-body-md", variants[variant], className)}
      role="status"
    >
      {title && <p className="font-semibold">{title}</p>}
      <p className={title ? "mt-1" : undefined}>{children}</p>
    </div>
  );
}
