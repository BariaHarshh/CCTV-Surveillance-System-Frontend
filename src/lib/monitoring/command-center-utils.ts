import type { CameraAIData } from "@/lib/monitoring/ai-metadata-parser";
import type { SeverityLevel } from "@/lib/monitoring/constants";
import { riskLevelFromScore } from "@/lib/monitoring/constants";

export interface CommandCameraItem {
  id: string;
  cameraId: string;
  name: string;
  status: string;
  type?: string;
  lastSeen?: string | null;
  location?: { building?: string; room?: string; areaLabel?: string };
  capacity?: number;
}

export interface CommandAlertItem {
  id: string;
  alertId?: string;
  title: string;
  severity: string;
  status: string;
  cameraId?: string | null;
  cameraName?: string;
  location?: { campus?: string; building?: string; room?: string; camera?: string };
  riskScore?: number;
  createdAt: string;
  source?: string;
}

export interface CommandEventItem {
  id: string;
  eventId?: string;
  eventType: string;
  severity: string;
  confidence?: number | null;
  detectedAt: string;
  status: string;
  source: string;
  cameraId?: string | null;
  cameraName?: string;
  riskScore?: number;
  riskLevel?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Maps a camera ID or module type to a descriptive AI feature title.
 */
export function getAIFeatureLabel(cameraId: string, moduleType?: string): string {
  if (moduleType === "OCCUPANCY_DETECTION" || cameraId.includes("1") || cameraId.toLowerCase().includes("entrance")) {
    return "Crowd Detection (YOLOv8 + ByteTrack)";
  }
  if (moduleType === "PERSON_DETECTION" || cameraId.includes("2") || cameraId.toLowerCase().includes("corridor")) {
    return "Behaviour Detection (Pose & Anomaly)";
  }
  if (moduleType === "RESTRICTED_ZONE" || cameraId.includes("3") || cameraId.toLowerCase().includes("server")) {
    return "Restricted Area (Perimeter Breach)";
  }
  if (moduleType === "ABANDONED_OBJECT" || cameraId.includes("4") || cameraId.toLowerCase().includes("library")) {
    return "Abandoned Object (Stationary Luggage)";
  }
  return "AI Vision Pipeline";
}

/**
 * Resolves camera display name from camera list or fallback.
 */
export function getCameraDisplayName(
  cameraIdOrDbId: string | null | undefined,
  cameras: CommandCameraItem[]
): string {
  if (!cameraIdOrDbId) return "Campus Camera";
  const matched = cameras.find(
    (c) => c.id === cameraIdOrDbId || c.cameraId === cameraIdOrDbId
  );
  if (matched) return matched.name || matched.cameraId;
  return cameraIdOrDbId;
}

/**
 * Calculates overall campus risk by taking the maximum risk score across all online cameras
 * and overview statistics, categorized via riskLevelFromScore.
 */
export function calculateOverallRisk(
  aiDataMap: Record<string, CameraAIData>,
  cameras: CommandCameraItem[],
  overviewRiskScore = 0
): { score: number; level: SeverityLevel } {
  const onlineCamIds = new Set(
    cameras.filter((c) => c.status === "ONLINE").map((c) => c.id)
  );

  const activeScores = Object.entries(aiDataMap)
    .filter(([camId]) => onlineCamIds.has(camId))
    .map(([, data]) => data.riskScore ?? 0);

  const maxCameraRisk = activeScores.length > 0 ? Math.max(...activeScores) : 0;
  const finalScore = Math.max(maxCameraRisk, overviewRiskScore, 0);

  return {
    score: finalScore,
    level: riskLevelFromScore(finalScore),
  };
}

/**
 * Calculates the active security alerts count from unresolved database alerts
 * and real-time active telemetry breach/fall/fight/abandoned states.
 */
export function calculateActiveAlertsCount(
  alerts: CommandAlertItem[],
  aiDataMap: Record<string, CameraAIData>
): number {
  const dbActiveCount = alerts.filter(
    (a) => a.status !== "RESOLVED" && a.status !== "DISMISSED"
  ).length;

  let telemetryAlerts = 0;
  for (const data of Object.values(aiDataMap)) {
    if (
      data.riskLevel === "CRITICAL" ||
      data.behavior?.hasFall ||
      data.behavior?.hasFight ||
      data.restrictedArea?.hasBreach ||
      data.restrictedArea?.zoneStatus === "ALERT" ||
      data.abandonedObject?.objectStatus === "ABANDONED" ||
      data.crowd?.crowdDetected
    ) {
      telemetryAlerts++;
    }
  }

  return Math.max(dbActiveCount, telemetryAlerts);
}

/**
 * Deduplicates events or alerts by unique ID or compound key,
 * sorting by newest first and capping at maxLimit.
 */
export function deduplicateEvents<
  T extends {
    id?: string;
    eventId?: string;
    alertId?: string;
    cameraId?: string | null;
    eventType?: string;
    title?: string;
    detectedAt?: string;
    createdAt?: string;
  }
>(existing: T[], incoming: T[], maxLimit = 20): T[] {
  const seen = new Set<string>();
  const combined = [...incoming, ...existing];

  combined.sort((a, b) => {
    const timeA = new Date(a.detectedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.detectedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const result: T[] = [];

  for (const item of combined) {
    const key =
      item.id ||
      item.eventId ||
      item.alertId ||
      `${item.cameraId || ""}-${item.eventType || item.title || ""}-${
        item.detectedAt || item.createdAt || ""
      }`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
      if (result.length >= maxLimit) break;
    }
  }

  return result;
}
