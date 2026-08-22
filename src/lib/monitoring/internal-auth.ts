import { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth/config";

export function validateInternalEventRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    const key = request.headers.get("x-internal-service-key");
    const expected = process.env.INTERNAL_EVENTS_API_KEY;
    if (!expected || key !== expected) return false;
  }
  return true;
}

export function isTestModeEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.MONITORING_TEST_MODE === "true";
}
