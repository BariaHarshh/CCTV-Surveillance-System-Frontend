import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/session";

export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(
  message: string,
  status: number,
  code?: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return apiError(error.message, error.code === "UNAUTHORIZED" ? 401 : 403, error.code);
  }

  console.error("[API Error]", error);

  if (error instanceof Error && error.message.includes("MongoServerSelectionError")) {
    return apiError(
      "Service temporarily unavailable. Please try again later.",
      503,
      "DATABASE_UNAVAILABLE"
    );
  }

  return apiError("An unexpected error occurred. Please try again.", 500, "INTERNAL_ERROR");
}
