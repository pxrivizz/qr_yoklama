import { cn } from "@/lib/cn";

type CardProps = React.ComponentProps<"div">;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_4px_6px_rgba(0,0,0,0.04)] card-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
