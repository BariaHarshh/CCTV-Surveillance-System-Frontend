import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const AUDIT_ACTIONS = [
  "SUPER_ADMIN_LOGIN",
  "VIEW_DASHBOARD",
  "VIEW_USER",
  "ACTIVATE_USER",
  "SUSPEND_USER",
  "UNLOCK_USER",
  "REVOKE_SESSION",
  "PROFILE_UPDATED",
  "PASSWORD_CHANGED",
  "ORGANIZATION_CREATED",
  "ORGANIZATION_UPDATED",
  "ORGANIZATION_SUSPENDED",
  "ORGANIZATION_ACTIVATED",
  "ORGANIZATION_DELETED",
  "ADMIN_CREATED",
  "ADMIN_UPDATED",
  "ADMIN_SUSPENDED",
  "ADMIN_ACTIVATED",
  "ADMIN_PERMISSION_CHANGED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGOUT",
  "ACCOUNT_LOCKED",
  "PASSWORD_RESET_REQUEST",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | null;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  targetType: string | null;
  targetId: Types.ObjectId | null;
  targetLabel: string | null;
  description: string;
  severity: AuditSeverity;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, default: "System" },
    actorRole: { type: String, default: "SYSTEM" },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetLabel: { type: String, default: null },
    description: { type: String, required: true },
    severity: { type: String, enum: AUDIT_SEVERITIES, default: "info" },
    ipAddress: { type: String, default: "unknown" },
    userAgent: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ?? mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
