import { NextRequest } from "next/server";
import { z } from "zod";
import { ensureDbReady } from "@/lib/auth/init-super-admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isTestModeEnabled } from "@/lib/monitoring/internal-auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { createEvent } from "@/lib/monitoring/event-service";
import { updateCameraStatus } from "@/lib/campus/camera-service";
import { broadcastCameraStatus } from "@/lib/monitoring/socket-emitter";
import { EVENT_TYPES } from "@/lib/monitoring/constants";

const schema = z.object({
  action: z.enum(["test_event", "test_critical_alert", "camera_online", "camera_offline"]),
  cameraId: z.string().optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isTestModeEnabled()) {
      return apiError("Test mode unavailable.", 403, "FORBIDDEN");
    }

    await ensureDbReady();
    const { user, organizationId } = await requireAdmin();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return apiError("Invalid test action.", 400, "VALIDATION_ERROR");

    const { action, cameraId, eventType } = parsed.data;

    if (action === "camera_online" || action === "camera_offline") {
      if (!cameraId) return apiError("cameraId required.", 400, "VALIDATION_ERROR");
      const status = action === "camera_online" ? "ONLINE" : "OFFLINE";
      const cam = await updateCameraStatus(organizationId, cameraId, status);
      if (!cam) return apiError("Camera not found.", 404, "NOT_FOUND");
      broadcastCameraStatus(organizationId, {
        cameraId: cam.cameraId,
        status: cam.status,
        timestamp: new Date().toISOString(),
        lastSeen: cam.lastSeen,
      });
      return apiSuccess({ camera: cam, source: "TEST" });
    }

    const type =
      eventType ??
      (action === "test_critical_alert" ? "UNAUTHORIZED_ENTRY" : "PERSON_DETECTED");

    const result = await createEvent({
      organizationId,
      cameraId: cameraId ?? null,
      eventType: type,
      confidence: action === "test_critical_alert" ? 0.92 : 0.65,
      source: "TEST",
      metadata: { testMode: true, triggeredBy: user.userId, simulated: true },
    });

    return apiSuccess({ ...result, source: "TEST", simulated: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
