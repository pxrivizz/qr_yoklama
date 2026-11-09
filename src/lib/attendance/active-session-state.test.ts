import { describe, expect, it } from "vitest";

import { activeSessionForCourse } from "./active-session-state";

describe("activeSessionForCourse", () => {
  it("istenen derse ait aktif oturumu gösterir", () => {
    const state = { courseId: "course-a", sessionId: "session-a" };

    expect(activeSessionForCourse("course-a", state)).toBe(state);
  });

  it("önceki veya farklı derse ait QR state'ini gizler", () => {
    expect(
      activeSessionForCourse("course-b", {
        courseId: "course-a",
        sessionId: "session-a",
      }),
    ).toBeUndefined();
  });

  it("aktif oturum yoksa boş döner", () => {
    expect(activeSessionForCourse("course-a", null)).toBeUndefined();
  });
});
