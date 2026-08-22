import type { Server as SocketIOServer } from "socket.io";
import { SOCKET_EVENTS, orgChannel } from "@/lib/monitoring/constants";

declare global {
  // eslint-disable-next-line no-var
  var __acg_io: SocketIOServer | undefined;
}

export function setSocketIO(io: SocketIOServer): void {
  global.__acg_io = io;
}

export function getSocketIO(): SocketIOServer | null {
  return global.__acg_io ?? null;
}

export function emitToOrganization(organizationId: string, event: string, payload: unknown): void {
  const io = getSocketIO();
  if (!io) return;
  io.to(orgChannel(organizationId)).emit(event, payload);
}

export function broadcastCameraStatus(
  organizationId: string,
  payload: { cameraId: string; status: string; timestamp: string; lastSeen: string | null }
): void {
  emitToOrganization(organizationId, SOCKET_EVENTS.CAMERA_STATUS, payload);
}

export function broadcastEventCreated(organizationId: string, payload: Record<string, unknown>): void {
  emitToOrganization(organizationId, SOCKET_EVENTS.EVENT_CREATED, payload);
}

export function broadcastEventUpdated(organizationId: string, payload: Record<string, unknown>): void {
  emitToOrganization(organizationId, SOCKET_EVENTS.EVENT_UPDATED, payload);
}

export function broadcastAlertCreated(organizationId: string, payload: Record<string, unknown>): void {
  emitToOrganization(organizationId, SOCKET_EVENTS.ALERT_CREATED, payload);
}

export function broadcastAlertUpdated(organizationId: string, payload: Record<string, unknown>): void {
  emitToOrganization(organizationId, SOCKET_EVENTS.ALERT_UPDATED, payload);
}

export function broadcastNotificationCreated(organizationId: string, payload: Record<string, unknown>): void {
  emitToOrganization(organizationId, SOCKET_EVENTS.NOTIFICATION_CREATED, payload);
}
