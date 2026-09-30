import { cn } from "@/lib/cn";
import type { AbsenceLimitLevel } from "@/lib/attendance/absence-limit";

type AbsenceLimitMeterProps = {
  absenceCount: number;
  limit: number;
  level: Exclude<AbsenceLimitLevel, "none">;
  isFailed: boolean;
  className?: string;
  compact?: boolean;
};

const stages = [
  { level: "safe", label: "Güvenli", color: "bg-emerald-500", muted: "bg-emerald-100" },
  { level: "warning", label: "Dikkat", color: "bg-amber-500", muted: "bg-amber-100" },
  { level: "danger", label: "Kritik", color: "bg-red-500", muted: "bg-red-100" },
] as const;

export function AbsenceLimitMeter({
  absenceCount,
  limit,
  level,
  isFailed,
  className,
  compact = false,
}: AbsenceLimitMeterProps) {
  const activeIndex = stages.findIndex((stage) => stage.level === level);
  const remaining = Math.max(0, limit - absenceCount);
  const statusText = isFailed
    ? "Devamsızlıktan kaldınız"
    : remaining === 1
      ? "Son 1 hakkınız kaldı"
      : `${remaining} devamsızlık hakkınız kaldı`;

  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest",
        compact ? "p-3" : "p-4",
        className,
      )}
      aria-label={`Devamsızlık durumu: ${stages[activeIndex]?.label ?? "Bilinmiyor"}. ${absenceCount}/${limit}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn("font-semibold text-on-surface", compact ? "text-xs" : "text-sm")}>
          {statusText}
        </p>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-on-surface-variant">
          {absenceCount}/{limit}
        </span>
      </div>

      <div className={cn("grid grid-cols-3 gap-1.5", compact ? "mt-2" : "mt-3")} aria-hidden="true">
        {stages.map((stage, index) => (
          <span
            key={stage.level}
            className={cn(
              "h-2 rounded-full transition-colors",
              index <= activeIndex ? stage.color : stage.muted,
            )}
          />
        ))}
      </div>

      {!compact && (
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px] font-medium">
          {stages.map((stage, index) => (
            <span
              key={stage.level}
              className={cn(
                index === 0 && "text-left",
                index === 1 && "text-center",
                index === 2 && "text-right",
                index === activeIndex ? "text-on-surface" : "text-on-surface-variant",
              )}
            >
              {stage.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
