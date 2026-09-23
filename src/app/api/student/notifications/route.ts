import { requireStudent } from "@/lib/auth/authorization";
import { apiErrorResponse } from "@/lib/http/api-error";
import {
  getStudentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/notifications/service";
import { readJsonBody } from "@/lib/http/request-body";
import { z } from "zod";

const notificationUpdateSchema = z
  .union([
    z.object({ all: z.literal(true) }).strict(),
    z.object({ id: z.string().min(1).max(64) }).strict(),
  ]);

export async function GET(request: Request) {
  try {
    const student = await requireStudent();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10) || 20;

    const data = await getStudentNotifications(student.id, limit);
    return Response.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const student = await requireStudent();
    const body = notificationUpdateSchema.parse(await readJsonBody(request));

    if ("all" in body) {
      await markAllNotificationsAsRead(student.id);
      return Response.json({ data: { success: true } });
    }

    if ("id" in body) {
      await markNotificationAsRead(student.id, body.id);
      return Response.json({ data: { success: true } });
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
