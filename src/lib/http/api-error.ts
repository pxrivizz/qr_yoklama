import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function prismaErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Gönderilen bilgiler geçersiz.",
          fields: error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const code = prismaErrorCode(error);
  if (code === "P2002") {
    return Response.json(
      {
        error: {
          code: "DUPLICATE_RECORD",
          message: "Aynı benzersiz bilgilere sahip bir kayıt zaten var.",
        },
      },
      { status: 409 },
    );
  }

  if (code === "P2025") {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Kayıt bulunamadı." } },
      { status: 404 },
    );
  }

  console.error("Beklenmeyen API hatası", error);
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "İşlem sırasında beklenmeyen bir hata oluştu.",
      },
    },
    { status: 500 },
  );
}
