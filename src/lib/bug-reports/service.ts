import "server-only";

import type { BugReportStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http/api-error";

const reportSelect = {
  id: true,
  subject: true,
  description: true,
  screenshotMimeType: true,
  pageUrl: true,
  userAgent: true,
  status: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  reporter: { select: { id: true, name: true, email: true, role: true } },
  handledBy: { select: { id: true, name: true, email: true, role: true } },
  responses: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      message: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, role: true } },
    },
  },
} as const;

const reporterReportSelect = {
  id: true,
  subject: true,
  description: true,
  status: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  responses: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      message: true,
      createdAt: true,
      author: { select: { name: true, role: true } },
    },
  },
} as const;

export async function createBugReport(input: {
  reporterId: string;
  subject: string;
  description: string;
  screenshotPath: string;
  screenshotMimeType: string;
  pageUrl?: string;
  userAgent?: string;
}) {
  return prisma.bugReport.create({ data: input, select: { id: true, status: true, createdAt: true } });
}

export async function listBugReports(input: {
  page: number;
  pageSize: number;
  status?: BugReportStatus;
}) {
  const where = input.status ? { status: input.status } : {};
  const [reports, total, groupedStatuses] = await Promise.all([
    prisma.bugReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: reportSelect,
    }),
    prisma.bugReport.count({ where }),
    prisma.bugReport.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const summary: Record<BugReportStatus, number> = { PENDING: 0, IN_PROGRESS: 0, FIXED: 0 };
  for (const item of groupedStatuses) summary[item.status] = item._count._all;

  return { reports, pagination: { page: input.page, pageSize: input.pageSize, total }, summary };
}

export async function listBugReportsForReporter(reporterId: string) {
  return prisma.bugReport.findMany({
    where: { reporterId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: reporterReportSelect,
  });
}

export async function getBugReportScreenshotMeta(reportId: string) {
  const report = await prisma.bugReport.findUnique({
    where: { id: reportId },
    select: { id: true, reporterId: true, screenshotPath: true, screenshotMimeType: true },
  });
  if (!report) throw new ApiError(404, "BUG_REPORT_NOT_FOUND", "Hata bildirimi bulunamadı.");
  return report;
}

export async function getBugReportForStaff(reportId: string) {
  const report = await prisma.bugReport.findUnique({
    where: { id: reportId },
    select: { ...reportSelect, screenshotPath: true },
  });
  if (!report) throw new ApiError(404, "BUG_REPORT_NOT_FOUND", "Hata bildirimi bulunamadı.");
  return report;
}

export async function updateBugReportStatus(input: {
  reportId: string;
  status: BugReportStatus;
  handledById: string;
}) {
  const report = await prisma.bugReport.findUnique({ where: { id: input.reportId }, select: { id: true } });
  if (!report) throw new ApiError(404, "BUG_REPORT_NOT_FOUND", "Hata bildirimi bulunamadı.");

  return prisma.bugReport.update({
    where: { id: input.reportId },
    data: {
      status: input.status,
      handledById: input.handledById,
      resolvedAt: input.status === "FIXED" ? new Date() : null,
    },
    select: reportSelect,
  });
}

export async function addBugReportResponse(input: {
  reportId: string;
  authorId: string;
  message: string;
}) {
  const report = await prisma.bugReport.findUnique({
    where: { id: input.reportId },
    select: { status: true },
  });
  if (!report) throw new ApiError(404, "BUG_REPORT_NOT_FOUND", "Hata bildirimi bulunamadı.");

  await prisma.$transaction([
    prisma.bugReportResponse.create({
      data: { reportId: input.reportId, authorId: input.authorId, message: input.message },
    }),
    prisma.bugReport.update({
      where: { id: input.reportId },
      data: {
        handledById: input.authorId,
        status: report.status === "PENDING" ? "IN_PROGRESS" : undefined,
      },
    }),
  ]);

  return getBugReportForStaff(input.reportId);
}
