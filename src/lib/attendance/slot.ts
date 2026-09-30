export type WeeklyAttendanceSlot = {
  weekNumber: number;
  sessionIndexInWeek: number;
};

export type PreparatoryAttendanceSlot = {
  sessionDate: string;
  lessonPeriod: number;
};

export type AttendanceSlot = WeeklyAttendanceSlot | PreparatoryAttendanceSlot;

export type PreparatoryDayPlan = {
  weekday: number;
  lessonCount: number;
};

export const WEEKDAYS = [
  { weekday: 1, label: "Pazartesi", shortLabel: "Pzt" },
  { weekday: 2, label: "Salı", shortLabel: "Sal" },
  { weekday: 3, label: "Çarşamba", shortLabel: "Çar" },
  { weekday: 4, label: "Perşembe", shortLabel: "Per" },
  { weekday: 5, label: "Cuma", shortLabel: "Cum" },

] as const;

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isPreparatorySlot(slot: AttendanceSlot): slot is PreparatoryAttendanceSlot {
  return "sessionDate" in slot;
}

export function parseSessionDate(value: string): Date {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) throw new RangeError("Geçerli bir yoklama tarihi seçin.");

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError("Geçerli bir yoklama tarihi seçin.");
  }

  return date;
}

export function sessionDateKey(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function weekdayForSessionDate(value: Date | string): number {
  const date = typeof value === "string" ? parseSessionDate(value) : value;
  const sundayBasedDay = date.getUTCDay();
  return sundayBasedDay === 0 ? 7 : sundayBasedDay;
}

export function lessonCountForDate(
  plans: PreparatoryDayPlan[],
  value: Date | string,
): number {
  const weekday = weekdayForSessionDate(value);
  return plans.find((plan) => plan.weekday === weekday)?.lessonCount ?? 0;
}

export function formatPreparatorySlot(date: Date | string, lessonPeriod: number): string {
  const parsed = typeof date === "string" ? parseSessionDate(date) : date;
  const formattedDate = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
  return `${formattedDate} · ${lessonPeriod}. ders`;
}

export function todayInIstanbul(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}
