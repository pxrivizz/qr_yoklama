export function activeSessionForCourse<T extends { courseId: string }>(
  courseId: string,
  state: T | null | undefined,
): T | undefined {
  return state?.courseId === courseId ? state : undefined;
}
