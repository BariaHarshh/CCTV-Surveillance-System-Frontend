import { describe, it, expect } from "vitest";
import { parseAIDataFromPayload } from "@/lib/monitoring/ai-metadata-parser";

describe("Monitoring Metadata & AI HUD Parser", () => {
  it("correctly parses CAM-000001 Crowd & Occupancy metadata", () => {
    const payload = {
      rawCount: 7,
      stableCount: 6,
      capacity: 10,
      crowdState: "CHECKING CROWD",
      riskScore: 28,
      riskLevel: "MEDIUM",
      detections: [
        {
          trackId: 1,
          label: "Person",
          confidence: 0.94,
          bbox: { x: 0.1, y: 0.2, w: 0.15, h: 0.4 },
        },
        {
          trackId: 2,
          label: "Person",
          confidence: 0.89,
          bbox: { x: 0.3, y: 0.22, w: 0.14, h: 0.38 },
        },
      ],
    };

    const parsed = parseAIDataFromPayload("CAM-000001", "OCCUPANCY_DETECTION", payload);

    expect(parsed.moduleType).toBe("OCCUPANCY_DETECTION");
    expect(parsed.riskScore).toBe(28);
    expect(parsed.riskLevel).toBe("MEDIUM");
    expect(parsed.crowd?.currentCount).toBe(6);
    expect(parsed.crowd?.stableCount).toBe(6);
    expect(parsed.crowd?.capacity).toBe(10);
    expect(parsed.crowd?.crowdState).toBe("CHECKING CROWD");
    expect(parsed.detections).toHaveLength(2);
    expect(parsed.detections[0].trackId).toBe(1);
    expect(parsed.detections[0].boundingBox.x).toBe(0.1);
  });

  it("correctly parses CAM-000002 Behaviour Detection metadata with Fall / Anomaly", () => {
    const payload = {
      behavior: {
        personCount: 2,
        behaviorState: "FALL_DETECTED",
        hasFall: true,
        hasFight: false,
        activeAlertsCount: 1,
      },
      riskScore: 85,
      riskLevel: "CRITICAL",
      detections: [
        {
          trackId: 10,
          label: "Person",
          status: "FALL_DETECTED",
          confidence: 0.96,
          bbox: { x: 0.4, y: 0.6, w: 0.3, h: 0.2 },
        },
      ],
    };

    const parsed = parseAIDataFromPayload("CAM-000002", "PERSON_DETECTION", payload);

    expect(parsed.moduleType).toBe("PERSON_DETECTION");
    expect(parsed.riskScore).toBe(85);
    expect(parsed.riskLevel).toBe("CRITICAL");
    expect(parsed.behavior?.behaviorState).toBe("FALL_DETECTED");
    expect(parsed.behavior?.hasFall).toBe(true);
    expect(parsed.detections).toHaveLength(1);
    expect(parsed.detections[0].status).toBe("CRITICAL");
    expect(parsed.detections[0].extraLabel).toBe("FALL");
  });

  it("correctly parses CAM-000003 Restricted Area Intrusion & Polygon Zone", () => {
    const payload = {
      restrictedArea: {
        zoneStatus: "ALERT",
        hasBreach: true,
        activeIntrudersCount: 1,
        activeIntruders: [42],
        zones: [
          {
            name: "Server Perimeter",
            status: "ALERT",
            severity: "critical",
            points: [
              [0.1, 0.2],
              [0.9, 0.2],
              [0.9, 0.8],
              [0.1, 0.8],
            ],
          },
        ],
      },
      riskScore: 92,
      riskLevel: "CRITICAL",
      detections: [
        {
          trackId: 42,
          label: "Person",
          inZone: true,
          confidence: 0.91,
          bbox: { x: 0.5, y: 0.5, w: 0.1, h: 0.3 },
        },
      ],
    };

    const parsed = parseAIDataFromPayload("CAM-000003", "RESTRICTED_ZONE", payload);

    expect(parsed.moduleType).toBe("RESTRICTED_ZONE");
    expect(parsed.riskScore).toBe(92);
    expect(parsed.restrictedArea?.zoneStatus).toBe("ALERT");
    expect(parsed.restrictedArea?.hasBreach).toBe(true);
    expect(parsed.restrictedArea?.activeIntrudersCount).toBe(1);
    expect(parsed.zones).toHaveLength(1);
    expect(parsed.zones[0].status).toBe("ALERT");
    expect(parsed.zones[0].polygon).toHaveLength(4);
    expect(parsed.zones[0].polygon[0]).toEqual({ x: 0.1, y: 0.2 });
    expect(parsed.detections[0].status).toBe("ALERT");
    expect(parsed.detections[0].extraLabel).toBe("INTRUDER");
  });

  it("correctly parses CAM-000004 Abandoned Object & Unattended Timers", () => {
    const payload = {
      abandonedObject: {
        objectStatus: "UNATTENDED",
        totalObjects: 1,
        unattendedCount: 1,
        abandonedCount: 0,
        unattendedDuration: 8.4,
      },
      riskScore: 40,
      riskLevel: "MEDIUM",
      detections: [
        {
          trackId: 5,
          label: "Suitcase",
          status: "UNATTENDED",
          timerSec: 8.4,
          confidence: 0.88,
          bbox: { x: 0.6, y: 0.7, w: 0.15, h: 0.2 },
        },
      ],
    };

    const parsed = parseAIDataFromPayload("CAM-000004", "ABANDONED_OBJECT", payload);

    expect(parsed.moduleType).toBe("ABANDONED_OBJECT");
    expect(parsed.riskScore).toBe(40);
    expect(parsed.riskLevel).toBe("MEDIUM");
    expect(parsed.abandonedObject?.objectStatus).toBe("UNATTENDED");
    expect(parsed.abandonedObject?.unattendedDuration).toBe(8.4);
    expect(parsed.detections[0].label).toBe("Suitcase");
    expect(parsed.detections[0].timerSec).toBe(8.4);
    expect(parsed.detections[0].status).toBe("WARNING");
    expect(parsed.detections[0].extraLabel).toBe("8.4s");
  });
});
