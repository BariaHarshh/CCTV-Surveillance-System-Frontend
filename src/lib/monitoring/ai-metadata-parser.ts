import type { OverlayDetection, OverlayZone } from "@/components/monitoring/DetectionOverlay";

export interface CameraCrowdDetails {
  rawCount: number;
  stableCount: number;
  currentCount: number;
  threshold: number;
  capacity: number;
  crowdState: "NORMAL" | "CHECKING CROWD" | "CROWD DETECTED" | string;
  crowdDetected: boolean;
  confirmationProgressSeconds?: number;
  requiredPersistenceSeconds?: number;
}

export interface CameraBehaviorDetails {
  personCount: number;
  behaviorState: "NORMAL" | "FALL_DETECTED" | "FIGHT_DETECTED" | "SUSPICIOUS" | string;
  eventType: string;
  hasFall: boolean;
  hasFight: boolean;
  personStates?: Array<{
    trackId: number;
    primaryState: string;
    fallProgress?: number;
    movementState?: string;
  }>;
  activeAlertsCount?: number;
}

export interface CameraRestrictedAreaDetails {
  zoneStatus: "SECURE" | "CHECKING" | "ALERT" | string;
  hasBreach: boolean;
  totalZones?: number;
  activeIntrudersCount: number;
  activeIntruders?: number[];
  zones?: Array<{
    name: string;
    severity?: string;
    status: "SECURE" | "CHECKING" | "ALERT" | string;
    points: Array<[number, number] | { x: number; y: number }>;
    intrudersCount?: number;
  }>;
}

export interface CameraAbandonedObjectDetails {
  objectStatus: "NORMAL" | "UNATTENDED" | "ABANDONED" | string;
  totalObjects: number;
  unattendedCount: number;
  abandonedCount: number;
  unattendedDuration: number;
}

export interface CameraAIData {
  moduleType: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  lastUpdate: string | null;
  crowd?: CameraCrowdDetails;
  behavior?: CameraBehaviorDetails;
  restrictedArea?: CameraRestrictedAreaDetails;
  abandonedObject?: CameraAbandonedObjectDetails;
  detections: OverlayDetection[];
  zones: OverlayZone[];
}

export function getDefaultAIData(cameraId: string): CameraAIData {
  const isCam1 = cameraId.includes("1") || cameraId.toLowerCase().includes("entrance");
  const isCam2 = cameraId.includes("2") || cameraId.toLowerCase().includes("corridor");
  const isCam3 = cameraId.includes("3") || cameraId.toLowerCase().includes("server");
  const isCam4 = cameraId.includes("4") || cameraId.toLowerCase().includes("library");

  if (isCam2) {
    return {
      moduleType: "PERSON_DETECTION",
      riskScore: 5,
      riskLevel: "LOW",
      lastUpdate: null,
      behavior: {
        personCount: 0,
        behaviorState: "NORMAL",
        eventType: "PERSON_DETECTED",
        hasFall: false,
        hasFight: false,
        activeAlertsCount: 0,
      },
      detections: [],
      zones: [],
    };
  }

  if (isCam3) {
    return {
      moduleType: "RESTRICTED_ZONE",
      riskScore: 5,
      riskLevel: "LOW",
      lastUpdate: null,
      restrictedArea: {
        zoneStatus: "SECURE",
        hasBreach: false,
        totalZones: 1,
        activeIntrudersCount: 0,
        activeIntruders: [],
      },
      detections: [],
      zones: [
        {
          name: "Server Rack Perimeter",
          status: "SECURE",
          severity: "critical",
          polygon: [
            { x: 0.15, y: 0.25 },
            { x: 0.85, y: 0.25 },
            { x: 0.85, y: 0.85 },
            { x: 0.15, y: 0.85 },
          ],
        },
      ],
    };
  }

  if (isCam4) {
    return {
      moduleType: "ABANDONED_OBJECT",
      riskScore: 5,
      riskLevel: "LOW",
      lastUpdate: null,
      abandonedObject: {
        objectStatus: "NORMAL",
        totalObjects: 0,
        unattendedCount: 0,
        abandonedCount: 0,
        unattendedDuration: 0,
      },
      detections: [],
      zones: [],
    };
  }

  // Default to CAM-000001 (Crowd/Occupancy)
  return {
    moduleType: "OCCUPANCY_DETECTION",
    riskScore: 5,
    riskLevel: "LOW",
    lastUpdate: null,
    crowd: {
      rawCount: 0,
      stableCount: 0,
      currentCount: 0,
      threshold: 10,
      capacity: 10,
      crowdState: "NORMAL",
      crowdDetected: false,
    },
    detections: [],
    zones: [],
  };
}

export function parseAIDataFromPayload(
  payloadCamId: string,
  moduleType: string | undefined,
  meta: Record<string, any>,
  existing?: CameraAIData
): CameraAIData {
  const currentRiskScore = Number(meta.riskScore ?? existing?.riskScore ?? 5);
  const currentRiskLevel = String(
    meta.riskLevel ??
      (currentRiskScore >= 75
        ? "CRITICAL"
        : currentRiskScore >= 50
        ? "HIGH"
        : currentRiskScore >= 25
        ? "MEDIUM"
        : "LOW")
  );

  const modType =
    moduleType ||
    meta.moduleType ||
    existing?.moduleType ||
    (payloadCamId.includes("1")
      ? "OCCUPANCY_DETECTION"
      : payloadCamId.includes("2")
      ? "PERSON_DETECTION"
      : payloadCamId.includes("3")
      ? "RESTRICTED_ZONE"
      : payloadCamId.includes("4")
      ? "ABANDONED_OBJECT"
      : "OCCUPANCY_DETECTION");

  let crowd = existing?.crowd;
  let behavior = existing?.behavior;
  let restrictedArea = existing?.restrictedArea;
  let abandonedObject = existing?.abandonedObject;
  let detections: OverlayDetection[] = [];
  let zones: OverlayZone[] = [];

  // Parse Detections if available in payload
  const rawDetections = Array.isArray(meta.detections)
    ? meta.detections
    : Array.isArray(meta.people)
    ? meta.people
    : Array.isArray(meta.objects)
    ? meta.objects
    : [];

  if (rawDetections.length > 0) {
    detections = rawDetections.map((d: any) => {
      const bbox = d.bbox || d.boundingBox || { x: 0, y: 0, w: 0, h: 0 };
      const normBbox = {
        x: Number(bbox.x ?? bbox.left ?? 0),
        y: Number(bbox.y ?? bbox.top ?? 0),
        w: Number(bbox.w ?? bbox.width ?? 0),
        h: Number(bbox.h ?? bbox.height ?? 0),
      };

      let status = d.status || d.primaryState || d.state || "NORMAL";
      let extraLabel = d.extraLabel;
      const timerSec =
        d.timerSec != null
          ? Number(d.timerSec)
          : d.unattendedDuration != null
          ? Number(d.unattendedDuration)
          : undefined;

      if (d.inZone) {
        status = "ALERT";
        extraLabel = "INTRUDER";
      } else if (String(status).includes("FALL")) {
        status = "CRITICAL";
        extraLabel = "FALL";
      } else if (String(status).includes("FIGHT")) {
        status = "CRITICAL";
        extraLabel = "FIGHT";
      } else if (String(status).includes("SUSPICIOUS")) {
        status = "WARNING";
        extraLabel = "SUSPICIOUS";
      } else if (String(status).includes("ABANDONED")) {
        status = "CRITICAL";
        extraLabel = "ABANDONED";
      } else if (String(status).includes("UNATTENDED")) {
        status = "WARNING";
        extraLabel = timerSec != null ? `${timerSec.toFixed(1)}s` : "UNATTENDED";
      }

      return {
        trackId: d.trackId != null ? Number(d.trackId) : null,
        label: d.label || "Person",
        confidence: d.confidence != null ? Number(d.confidence) : 0.9,
        status,
        extraLabel,
        timerSec,
        boundingBox: normBbox,
      };
    });
  } else if (meta.boundingBox) {
    detections = [
      {
        label: "Detection",
        confidence: meta.confidence != null ? Number(meta.confidence) : 0.9,
        boundingBox: meta.boundingBox,
      },
    ];
  }

  // Parse Zones if available
  const rawZones = meta.restrictedArea?.zones || meta.zones;
  if (Array.isArray(rawZones)) {
    zones = rawZones.map((z: any) => {
      const rawPoints = Array.isArray(z.points)
        ? z.points
        : Array.isArray(z.polygon)
        ? z.polygon
        : [];
      const polygon = rawPoints.map((pt: any) => {
        if (Array.isArray(pt)) {
          return { x: Number(pt[0] ?? 0), y: Number(pt[1] ?? 0) };
        }
        return { x: Number(pt.x ?? 0), y: Number(pt.y ?? 0) };
      });

      return {
        name: String(z.name || "Restricted Zone"),
        status: (z.status === "ALERT" || z.status === "CHECKING" ? z.status : "SECURE") as
          | "SECURE"
          | "CHECKING"
          | "ALERT",
        severity: z.severity,
        polygon,
      };
    });
  }

  // 1. Crowd / Occupancy
  if (
    modType === "OCCUPANCY_DETECTION" ||
    meta.crowd ||
    meta.crowdState !== undefined ||
    meta.currentCount !== undefined
  ) {
    const rawCrowd = meta.crowd || {};
    const count = Number(
      rawCrowd.currentCount ??
        rawCrowd.stableCount ??
        meta.currentCount ??
        meta.stableCount ??
        existing?.crowd?.currentCount ??
        0
    );
    const stable = Number(rawCrowd.stableCount ?? meta.stableCount ?? count);
    const raw = Number(rawCrowd.rawCount ?? meta.rawCount ?? count);
    const cap = Number(
      rawCrowd.capacity ??
        rawCrowd.threshold ??
        meta.capacity ??
        meta.threshold ??
        existing?.crowd?.capacity ??
        10
    );

    const state = rawCrowd.crowdState || meta.crowdState || existing?.crowd?.crowdState || "NORMAL";
    const sUpper = String(state).toUpperCase();
    let normState: "NORMAL" | "CHECKING CROWD" | "CROWD DETECTED" = "NORMAL";
    if (
      sUpper.includes("CROWD DETECTED") ||
      sUpper.includes("HIGH") ||
      sUpper.includes("CRITICAL") ||
      count >= cap
    ) {
      normState = "CROWD DETECTED";
    } else if (
      sUpper.includes("CHECKING") ||
      sUpper.includes("ELEVATED") ||
      sUpper.includes("MEDIUM") ||
      count >= Math.floor(cap * 0.7)
    ) {
      normState = "CHECKING CROWD";
    }

    crowd = {
      rawCount: raw,
      stableCount: stable,
      currentCount: count,
      threshold: cap,
      capacity: cap,
      crowdState: normState,
      crowdDetected: normState === "CROWD DETECTED",
      confirmationProgressSeconds:
        rawCrowd.confirmationProgressSeconds != null
          ? Number(rawCrowd.confirmationProgressSeconds)
          : undefined,
      requiredPersistenceSeconds:
        rawCrowd.requiredPersistenceSeconds != null
          ? Number(rawCrowd.requiredPersistenceSeconds)
          : undefined,
    };
  }

  // 2. Behavior Detection
  if (modType === "PERSON_DETECTION" || meta.behavior || meta.behaviorState !== undefined) {
    const rawBehav = meta.behavior || {};
    behavior = {
      personCount: Number(rawBehav.personCount ?? meta.personCount ?? detections.length ?? 0),
      behaviorState: String(rawBehav.behaviorState ?? meta.behaviorState ?? "NORMAL"),
      eventType: String(rawBehav.eventType ?? meta.eventType ?? "PERSON_DETECTED"),
      hasFall: Boolean(rawBehav.hasFall ?? meta.hasFall ?? false),
      hasFight: Boolean(rawBehav.hasFight ?? meta.hasFight ?? false),
      personStates: rawBehav.personStates || meta.personStates,
      activeAlertsCount: Number(rawBehav.activeAlertsCount ?? 0),
    };
  }

  // 3. Restricted Zone
  if (modType === "RESTRICTED_ZONE" || meta.restrictedArea || meta.zoneStatus !== undefined) {
    const rawRA = meta.restrictedArea || {};
    const intruders = Array.isArray(rawRA.activeIntruders)
      ? rawRA.activeIntruders
      : Array.isArray(meta.activeIntruders)
      ? meta.activeIntruders
      : [];
    const hasBreach = Boolean(rawRA.hasBreach ?? meta.hasBreach ?? intruders.length > 0);
    const zStatus = hasBreach
      ? "ALERT"
      : rawRA.zoneStatus ??
        meta.zoneStatus ??
        (zones.some((z) => z.status === "ALERT") ? "ALERT" : "SECURE");

    restrictedArea = {
      zoneStatus: zStatus,
      hasBreach,
      totalZones: rawRA.totalZones ?? zones.length,
      activeIntrudersCount: intruders.length,
      activeIntruders: intruders,
      zones: rawRA.zones ?? meta.zones,
    };
  }

  // 4. Abandoned Object
  if (modType === "ABANDONED_OBJECT" || meta.abandonedObject || meta.objectStatus !== undefined) {
    const rawAO = meta.abandonedObject || {};
    const unattended = Number(rawAO.unattendedCount ?? meta.unattendedCount ?? 0);
    const abandoned = Number(rawAO.abandonedCount ?? meta.abandonedCount ?? 0);
    const duration = Number(rawAO.unattendedDuration ?? meta.unattendedDuration ?? 0);
    const objStatus = String(
      rawAO.objectStatus ??
        meta.objectStatus ??
        (abandoned > 0 ? "ABANDONED" : unattended > 0 ? "UNATTENDED" : "NORMAL")
    );

    abandonedObject = {
      objectStatus: objStatus,
      totalObjects: Number(
        rawAO.totalObjects ?? (Array.isArray(rawAO.objects) ? rawAO.objects.length : 1)
      ),
      unattendedCount: unattended,
      abandonedCount: abandoned,
      unattendedDuration: duration,
    };
  }

  return {
    moduleType: modType,
    riskScore: currentRiskScore,
    riskLevel: currentRiskLevel,
    lastUpdate: new Date().toISOString(),
    crowd,
    behavior,
    restrictedArea,
    abandonedObject,
    detections: detections.length > 0 ? detections : existing?.detections ?? [],
    zones: zones.length > 0 ? zones : existing?.zones ?? [],
  };
}
