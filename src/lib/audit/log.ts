import type { NextRequest } from "next/server";
import { AuditLog, type AuditAction, type AuditSeverity } from "@/models/AuditLog";
import type { IUser } from "@/models/User";
import type { Types } from "mongoose";
import { getClientIp } from "@/lib/auth/rate-limit";

interface LogAuditParams {
  actor?: IUser | null;
  action: AuditAction;
  description: string;
  request?: NextRequest;
  targetType?: string | null;
  targetId?: Types.ObjectId | string | null;
  targetLabel?: string | null;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent({
  actor,
  action,
  description,
  request,
  targetType = null,
  targetId = null,
  targetLabel = null,
  severity = "info",
  metadata = {},
  ipAddress,
  userAgent,
}: LogAuditParams): Promise<void> {
  try {
    await AuditLog.create({
      actorId: actor?._id ?? null,
      actorName: actor?.name ?? "System",
      actorRole: actor?.role ?? "SYSTEM",
      action,
      targetType,
      targetId: targetId ?? null,
      targetLabel,
      description,
      severity,
      ipAddress: ipAddress ?? (request ? getClientIp(request) : "unknown"),
      userAgent: userAgent ?? request?.headers.get("user-agent") ?? "",
      metadata,
    });
  } catch {
    // Audit logging must not block operations
  }
}