import "server-only";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";

export type StudentAttendanceSessionItem = {
  sessionId: string;
  weekNumber: number;
  sessionIndexInWeek: number;
  startedAt: Date;
  endedAt: Date | null;
  sessionStatus: "ACTIVE" | "CLOSED";
  status: "PRESENT" | "EXCUSED" | "ABSENT" | "ACTIVE_PENDING";
  statusLabel: string;
  isAttended: boolean;
  isExcused: boolean;
  excuseReason: string | null;
  note: string | null;
  source: string | null;
  recordedAt: Date | null;
};

export type StudentCourseAttendanceDetail = {
  course: {
    id: string;
    code: string;
    name: string;
    mandatoryAlertLimit: number | null;
    weeklySessionCount: number;
    totalWeeks: number;
    teacher: {
      name: string | null;
      email: string;
    };
  };
  enrollment: {
    id: string;
    isMandatory: boolean;
    fullNameOnList: string;
    schoolNumberOnList: string;
  };
  summary: {
    totalSessions: number;
    attendedCount: number;
    excusedAbsenceCount: number;
    unexcusedAbsenceCount: number;
    totalAbsenceCount: number;
    absencePercentage: number;
    attendanceRate: number;
    hasLimit: boolean;
    limit: number | null;
    remainingAllowance: number | null;
    isFailed: boolean;
    isAtLimit: boolean;
    isNearLimit: boolean;
    limitStatusText: string;
  };
  activeSession: {
    sessionId: string;
    weekNumber: number;
    sessionIndexInWeek: number;
    startedAt: Date;
    alreadyAttended: boolean;
  } | null;
  history: StudentAttendanceSessionItem[];
};

export async function getStudentCourseAttendanceDetail(
  studentId: string,
  courseId: string,
): Promise<StudentCourseAttendanceDetail> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { courseId, matchedUserId: studentId },
    include: {
      course: {
        include: {
          teacher: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new ApiError(
      403,
      "STUDENT_NOT_ENROLLED",
      "Bu derse kayıtlı değilsiniz veya öğrenci numaranız bu dersle eşleştirilmemiş.",
    );
  }

  const sessions = await prisma.attendanceSession.findMany({
    where: { courseId },
    orderBy: [
      { startedAt: "desc" },
      { weekNumber: "desc" },
      { sessionIndexInWeek: "desc" },
    ],
    include: {
      attendanceRecords: {
        where: { enrollmentId: enrollment.id },
      },
    },
  });

  const closedSessions = sessions.filter((s) => s.status === "CLOSED");
  let attendedCount = 0;
  let excusedAbsenceCount = 0;
  let unexcusedAbsenceCount = 0;

  for (const session of closedSessions) {
    const record = session.attendanceRecords[0];
    if (!record) {
      unexcusedAbsenceCount += 1;
    } else if (record.status === "PRESENT") {
      attendedCount += 1;
    } else if (record.isExcused) {
      excusedAbsenceCount += 1;
    } else {
      unexcusedAbsenceCount += 1;
    }
  }

  const totalAbsenceCount = excusedAbsenceCount + unexcusedAbsenceCount;
  const totalSessions = closedSessions.length;
  const absencePercentage =
    totalSessions > 0 ? Math.round((totalAbsenceCount / totalSessions) * 100) : 0;
  const attendanceRate =
    totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 100;

  const limit = enrollment.course.mandatoryAlertLimit;
  const hasLimit = enrollment.isMandatory && limit !== null && limit > 0;
  const isFailed = hasLimit && totalAbsenceCount > limit;
  const isAtLimit = hasLimit && totalAbsenceCount === limit;
  const isNearLimit = hasLimit && totalAbsenceCount === limit - 1;
  const remainingAllowance = hasLimit ? Math.max(0, limit - totalAbsenceCount) : null;

  let limitStatusText = "Devamsızlık Durumu Güvenli";
  if (!enrollment.isMandatory) {
    limitStatusText = "Devamsızlık Zorunluluğu Yok (Muaf)";
  } else if (isFailed) {
    limitStatusText = `Devamsızlıktan Kaldınız (${totalAbsenceCount}/${limit} devamsızlık)`;
  } else if (isAtLimit) {
    limitStatusText = `Devamsızlık Sınırındasınız (${totalAbsenceCount}/${limit} - Son hakkınızı kullandınız!)`;
  } else if (isNearLimit) {
    limitStatusText = `Devamsızlık Sınırına Yaklaştınız (${totalAbsenceCount}/${limit} - Kalan hak: 1)`;
  } else if (hasLimit) {
    limitStatusText = `Devamsızlık Durumu Güvenli (${totalAbsenceCount}/${limit} - Kalan hak: ${remainingAllowance})`;
  }

  const history: StudentAttendanceSessionItem[] = sessions.map((session) => {
    const record = session.attendanceRecords[0];
    const isClosed = session.status === "CLOSED";

    let status: StudentAttendanceSessionItem["status"];
    let statusLabel: string;
    let isAttended = false;
    let isExcused = false;

    if (!isClosed) {
      if (!record) {
        status = "ACTIVE_PENDING";
        statusLabel = "Yoklama Açık (Okutulmadı)";
      } else if (record.status === "PRESENT") {
        status = "PRESENT";
        statusLabel = "Katıldınız";
        isAttended = true;
      } else if (record.isExcused) {
        status = "EXCUSED";
        statusLabel = "Mazeretli";
        isExcused = true;
      } else {
        status = "ACTIVE_PENDING";
        statusLabel = "Yoklama Açık (Okutulmadı)";
      }
    } else {
      if (!record) {
        status = "ABSENT";
        statusLabel = "Devamsız";
      } else if (record.status === "PRESENT") {
        status = "PRESENT";
        statusLabel = "Katıldı";
        isAttended = true;
      } else if (record.isExcused) {
        status = "EXCUSED";
        statusLabel = "Mazeretli Devamsız";
        isExcused = true;
      } else {
        status = "ABSENT";
        statusLabel = "Devamsız";
      }
    }

    let sourceText: string | null = null;
    if (record?.source === "QR_SCAN") {
      sourceText = "QR Kod Tarama";
    } else if (record?.source === "TEACHER_MANUAL") {
      sourceText = "Öğretmen Tarafından Eklendi";
    }

    return {
      sessionId: session.id,
      weekNumber: session.weekNumber,
      sessionIndexInWeek: session.sessionIndexInWeek,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      sessionStatus: session.status,
      status,
      statusLabel,
      isAttended,
      isExcused: isExcused || Boolean(record?.isExcused),
      excuseReason: record?.excuseReason ?? null,
      note: record?.note ?? null,
      source: sourceText,
      recordedAt: record?.recordedAt ?? null,
    };
  });

  const active = sessions.find((s) => s.status === "ACTIVE");
  const activeSession = active
    ? {
        sessionId: active.id,
        weekNumber: active.weekNumber,
        sessionIndexInWeek: active.sessionIndexInWeek,
        startedAt: active.startedAt,
        alreadyAttended: Boolean(active.attendanceRecords[0]),
      }
    : null;

  return {
    course: {
      id: enrollment.course.id,
      code: enrollment.course.code,
      name: enrollment.course.name,
      mandatoryAlertLimit: enrollment.course.mandatoryAlertLimit,
      weeklySessionCount: enrollment.course.weeklySessionCount,
      totalWeeks: enrollment.course.totalWeeks,
      teacher: {
        name: enrollment.course.teacher.name,
        email: enrollment.course.teacher.email,
      },
    },
    enrollment: {
      id: enrollment.id,
      isMandatory: enrollment.isMandatory,
      fullNameOnList: enrollment.fullNameOnList,
      schoolNumberOnList: enrollment.schoolNumberOnList,
    },
    summary: {
      totalSessions,
      attendedCount,
      excusedAbsenceCount,
      unexcusedAbsenceCount,
      totalAbsenceCount,
      absencePercentage,
      attendanceRate,
      hasLimit,
      limit,
      remainingAllowance,
      isFailed,
      isAtLimit,
      isNearLimit,
      limitStatusText,
    },
    activeSession,
    history,
  };
}
