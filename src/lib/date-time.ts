const TURKEY_TIME_ZONE = "Europe/Istanbul";

const turkeyDateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TURKEY_TIME_ZONE,
});

export function formatTurkeyDateTime(value: Date | string) {
  return turkeyDateTimeFormatter.format(new Date(value));
}
