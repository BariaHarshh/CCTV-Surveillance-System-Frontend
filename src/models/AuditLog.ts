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
  "ADMIN_LOGIN",
  "STAFF_CREATED",
  "STAFF_UPDATED",
  "STAFF_ACTIVATED",
  "STAFF_SUSPENDED",
  "STAFF_UNLOCKED",
  "STAFF_PERMISSION_CHANGED",
  "STAFF_PASSWORD_RESET",
  "ORGANIZATION_VIEWED",
  "STAFF_LOGIN",
  "CAMPUS_UPDATED",
  "BUILDING_CREATED",
  "BUILDING_UPDATED",
  "BUILDING_STATUS_CHANGED",
  "ROOM_CREATED",
  "ROOM_UPDATED",
  "ROOM_STATUS_CHANGED",
  "CAMERA_CREATED",
  "CAMERA_UPDATED",
  "CAMERA_TESTED",
  "CAMERA_ENABLED",
  "CAMERA_DISABLED",
  "CAMERA_REMOVED",
  "STAFF_PROFILE_UPDATED",
  "STAFF_PASSWORD_CHANGED",
  "STAFF_SESSION_REVOKED",
  "EVENT_CREATED",
  "EVENT_VIEWED",
  "ALERT_CREATED",
  "ALERT_ACKNOWLEDGED",
  "ALERT_INVESTIGATION_STARTED",
  "ALERT_RESOLVED",
  "ALERT_DISMISSED",
  "ALERT_ASSIGNED",
  "NOTIFICATION_READ",
  "INQUIRY_RECEIVED",
  "INQUIRY_VIEWED",
  "INQUIRY_STATUS_CHANGED",
  "AI_MODULE_ENABLED",
  "AI_MODULE_DISABLED",
  "AI_CONFIGURATION_UPDATED",
  "DETECTION_CREATED",
  "DETECTION_FEEDBACK_CREATED",
  "INCIDENT_CREATED",
  "INCIDENT_ASSIGNED",
  "INCIDENT_RESOLVED",
  "INCIDENT_DISMISSED",
  "AI_PROVIDER_CHANGED",
  "AI_CONFIGURATION_RESET",
  "EMERGENCY_CREATED",
  "EMERGENCY_ACTIVATED",
  "EMERGENCY_UPDATED",
  "EMERGENCY_RESOLVED",
  "EMERGENCY_CANCELLED",
  "INCIDENT_ESCALATED",
  "TEAM_ASSIGNED",
  "TASK_CREATED",
  "TASK_COMPLETED",
  "PLAYBOOK_STARTED",
  "PLAYBOOK_STEP_COMPLETED",
  "PLAYBOOK_UPDATED",
  "ESCALATION_TRIGGERED",
  "ESCALATION_ACKNOWLEDGED",
  "EMERGENCY_MESSAGE_SENT",
  "RESPONSE_TEAM_UPDATED",
  "EMERGENCY_CONTACT_UPDATED",
  "LOGIN_FAILED",
  "LOGOUT",
  "ACCOUNT_LOCKED",
  "PASSWORD_RESET_REQUEST",
  "LOGIN_SUCCESS",
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
