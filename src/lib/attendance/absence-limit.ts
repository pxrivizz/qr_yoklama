export type AbsenceLimitLevel = "none" | "safe" | "warning" | "danger";

export function calculateAbsenceLimitStatus(
  absenceCount: number,
  limit: number | null,
  isMandatory: boolean,
) {
  const hasLimit = isMandatory && limit !== null && limit > 0;
  const remainingAllowance = hasLimit ? Math.max(0, limit - absenceCount) : null;
  const isFailed = hasLimit && absenceCount >= limit;
  const isAtLimit = hasLimit && absenceCount === limit;
  const isNearLimit = hasLimit && !isFailed && remainingAllowance === 1;

  let limitLevel: AbsenceLimitLevel = "none";
  if (hasLimit) {
    const usageRatio = absenceCount / limit;
    limitLevel = isFailed || remainingAllowance === 1
      ? "danger"
      : usageRatio >= 0.5
        ? "warning"
        : "safe";
  }

  return {
    hasLimit,
    remainingAllowance,
    isFailed,
    isAtLimit,
    isNearLimit,
    limitLevel,
  };
}
