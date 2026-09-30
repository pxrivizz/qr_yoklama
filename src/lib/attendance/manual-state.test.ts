import { describe, expect, it } from "vitest";

import {
  buildManualAttendanceRecords,
  chooseInitialManualAttendanceSlot,
} from "./manual-state";

describe("manuel yoklama başlangıç durumu", () => {
  it("QR ile alınmış mevcut yoklamaları korur ve kaydı olmayanları yok yazar", () => {
    expect(
      buildManualAttendanceRecords(
        ["halil", "mert", "diger"],
        [
          { enrollmentId: "halil", status: "PRESENT" },
          { enrollmentId: "mert", status: "PRESENT" },
        ],
      ),
    ).toEqual({ halil: "PRESENT", mert: "PRESENT", diger: "ABSENT" });
  });

  it("aktif oturumu, ardından son QR oturumunu, sonra en son oturumu seçer", () => {
    const qr = {
      weekNumber: 1,
      sessionIndexInWeek: 2,
      status: "CLOSED" as const,
      createdBy: "SYSTEM_QR" as const,
    };
    const manual = {
      weekNumber: 1,
      sessionIndexInWeek: 3,
      status: "CLOSED" as const,
      createdBy: "TEACHER_MANUAL" as const,
    };
    const active = {
      weekNumber: 1,
      sessionIndexInWeek: 4,
      status: "ACTIVE" as const,
      createdBy: "SYSTEM_QR" as const,
    };

    expect(chooseInitialManualAttendanceSlot([manual, qr, active], { weekNumber: 2, sessionIndexInWeek: 1 }))
      .toBe(active);
    expect(chooseInitialManualAttendanceSlot([manual, qr], { weekNumber: 2, sessionIndexInWeek: 1 }))
      .toBe(qr);
    expect(chooseInitialManualAttendanceSlot([manual], { weekNumber: 2, sessionIndexInWeek: 1 }))
      .toBe(manual);
    expect(chooseInitialManualAttendanceSlot([], { weekNumber: 2, sessionIndexInWeek: 1 }))
      .toEqual({ weekNumber: 2, sessionIndexInWeek: 1 });
  });
});
