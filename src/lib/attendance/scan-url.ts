export function buildAttendanceScanUrl(
  appUrl: string,
  token: string,
  courseId: string,
) {
  const url = new URL("/tara", appUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("courseId", courseId);
  return url.toString();
}
