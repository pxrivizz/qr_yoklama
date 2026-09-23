export type SessionSlot = {
  weekNumber: number;
  sessionIndexInWeek: number;
};

export function calculatePlannedSessionCount(
  weeklySessionCount: number,
  totalWeeks: number,
): number {
  if (!Number.isInteger(weeklySessionCount) || weeklySessionCount <= 0) {
    throw new RangeError("Haftalık yoklama sayısı pozitif bir tam sayı olmalıdır.");
  }

  if (!Number.isInteger(totalWeeks) || totalWeeks <= 0) {
    throw new RangeError("Toplam hafta sayısı pozitif bir tam sayı olmalıdır.");
  }

  return weeklySessionCount * totalWeeks;
}

export function calculateNextSessionSlot(
  completedSessionCount: number,
  weeklySessionCount: number,
): SessionSlot {
  if (!Number.isInteger(completedSessionCount) || completedSessionCount < 0) {
    throw new RangeError("Tamamlanan oturum sayısı negatif olamaz.");
  }

  if (!Number.isInteger(weeklySessionCount) || weeklySessionCount <= 0) {
    throw new RangeError("Haftalık yoklama sayısı pozitif bir tam sayı olmalıdır.");
  }

  return {
    weekNumber: Math.floor(completedSessionCount / weeklySessionCount) + 1,
    sessionIndexInWeek: (completedSessionCount % weeklySessionCount) + 1,
  };
}
