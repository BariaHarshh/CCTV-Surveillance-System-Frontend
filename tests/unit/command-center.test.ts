import { describe, it, expect } from "vitest";
import {
  calculateOverallRisk,
  calculateActiveAlertsCount,
  deduplicateEvents,
  getAIFeatureLabel,
  getCameraDisplayName,
  type CommandCameraItem,
  type CommandAlertItem,
  type CommandEventItem,
} from "@/lib/monitoring/command-center-utils";
import { getDefaultAIData } from "@/lib/monitoring/ai-metadata-parser";
import { normalizeEventType } from "@/lib/monitoring/constants";

describe("AI Security Command Center - Utilities & Metrics", () => {
  const mockCameras: CommandCameraItem[] = [
    {
      id: "cam-db-1",
      cameraId: "CAM-000001",
      name: "Main Entrance Gate",
      status: "ONLINE",
      location: { building: "Gate 1", room: "Entrance" },
    },
    {
      id: "cam-db-2",
      cameraId: "CAM-000002",
      name: "Main Corridor",
      status: "ONLINE",
      location: { building: "Block A", room: "Corridor 1" },
    },
    {
      id: "cam-db-3",
      cameraId: "CAM-000003",
      name: "Server Room",
      status: "ONLINE",
      location: { building: "IT Wing", room: "Server Room" },
    },
    {
      id: "cam-db-4",
      cameraId: "CAM-000004",
      name: "Central Library",
      status: "ONLINE",
      location: { building: "Library Building", room: "Floor 2" },
    },
  ];

  describe("1. AI Feature Label Mapping", () => {
    it("maps all 4 camera pipelines to their dedicated AI titles", () => {
      expect(getAIFeatureLabel("CAM-000001")).toBe("Crowd Detection (YOLOv8 + ByteTrack)");
      expect(getAIFeatureLabel("CAM-000002")).toBe("Behaviour Detection (Pose & Anomaly)");
      expect(getAIFeatureLabel("CAM-000003")).toBe("Restricted Area (Perimeter Breach)");
      expect(getAIFeatureLabel("CAM-000004")).toBe("Abandoned Object (Stationary Luggage)");
    });

    it("falls back gracefully for unknown camera formats", () => {
      expect(getAIFeatureLabel("CAM-999999")).toBe("AI Vision Pipeline");
    });
  });

  describe("2. Camera Display Name Resolution", () => {
    it("resolves friendly camera name from camera code or MongoDB ID", () => {
      expect(getCameraDisplayName("CAM-000001", mockCameras)).toBe("Main Entrance Gate");
      expect(getCameraDisplayName("cam-db-3", mockCameras)).toBe("Server Room");
      expect(getCameraDisplayName("UNKNOWN-CAM", mockCameras)).toBe("UNKNOWN-CAM");
      expect(getCameraDisplayName(null, mockCameras)).toBe("Campus Camera");
    });
  });

  describe("3. Global Campus Threat Risk Calculation", () => {
    it("calculates overall risk as the maximum threat across all online cameras", () => {
      const aiDataMap = {
        "cam-db-1": { ...getDefaultAIData("CAM-000001"), riskScore: 15, riskLevel: "LOW" },
        "cam-db-2": { ...getDefaultAIData("CAM-000002"), riskScore: 35, riskLevel: "MEDIUM" },
        "cam-db-3": { ...getDefaultAIData("CAM-000003"), riskScore: 88, riskLevel: "CRITICAL" },
        "cam-db-4": { ...getDefaultAIData("CAM-000004"), riskScore: 20, riskLevel: "LOW" },
      };

      const result = calculateOverallRisk(aiDataMap, mockCameras, 0);
      expect(result.score).toBe(88);
      expect(result.level).toBe("CRITICAL");
    });

    it("ignores offline cameras during risk score aggregation", () => {
      const camerasWithOffline: CommandCameraItem[] = [
        { ...mockCameras[0], status: "ONLINE" },
        { ...mockCameras[1], status: "ONLINE" },
        { ...mockCameras[2], status: "OFFLINE" }, // High risk camera is offline
        { ...mockCameras[3], status: "ONLINE" },
      ];

      const aiDataMap = {
        "cam-db-1": { ...getDefaultAIData("CAM-000001"), riskScore: 10, riskLevel: "LOW" },
        "cam-db-2": { ...getDefaultAIData("CAM-000002"), riskScore: 45, riskLevel: "MEDIUM" },
        "cam-db-3": { ...getDefaultAIData("CAM-000003"), riskScore: 95, riskLevel: "CRITICAL" },
        "cam-db-4": { ...getDefaultAIData("CAM-000004"), riskScore: 20, riskLevel: "LOW" },
      };

      const result = calculateOverallRisk(aiDataMap, camerasWithOffline, 0);
      expect(result.score).toBe(45);
      expect(result.level).toBe("MEDIUM");
    });

    it("returns nominal LOW risk when all cameras operate within baseline parameters", () => {
      const aiDataMap = {
        "cam-db-1": { ...getDefaultAIData("CAM-000001"), riskScore: 5, riskLevel: "LOW" },
        "cam-db-2": { ...getDefaultAIData("CAM-000002"), riskScore: 5, riskLevel: "LOW" },
        "cam-db-3": { ...getDefaultAIData("CAM-000003"), riskScore: 5, riskLevel: "LOW" },
        "cam-db-4": { ...getDefaultAIData("CAM-000004"), riskScore: 5, riskLevel: "LOW" },
      };

      const result = calculateOverallRisk(aiDataMap, mockCameras, 0);
      expect(result.score).toBe(5);
      expect(result.level).toBe("LOW");
    });
  });

  describe("4. Active Alerts Count Calculation", () => {
    it("counts unresolved active database alerts", () => {
      const alerts: CommandAlertItem[] = [
        {
          id: "alt-1",
          title: "Intrusion in Server Room",
          severity: "CRITICAL",
          status: "NEW",
          createdAt: new Date().toISOString(),
        },
        {
          id: "alt-2",
          title: "Loitering Corridor",
          severity: "MEDIUM",
          status: "INVESTIGATING",
          createdAt: new Date().toISOString(),
        },
        {
          id: "alt-3",
          title: "Old Closed Alert",
          severity: "LOW",
          status: "RESOLVED",
          createdAt: new Date().toISOString(),
        },
      ];

      const aiDataMap = {
        "cam-db-1": getDefaultAIData("CAM-000001"),
        "cam-db-2": getDefaultAIData("CAM-000002"),
        "cam-db-3": getDefaultAIData("CAM-000003"),
        "cam-db-4": getDefaultAIData("CAM-000004"),
      };

      const count = calculateActiveAlertsCount(alerts, aiDataMap);
      expect(count).toBe(2); // alt-1 and alt-2
    });

    it("includes active real-time telemetry alerts from live camera HUDs", () => {
      const emptyAlerts: CommandAlertItem[] = [];

      const aiDataMap = {
        "cam-db-1": getDefaultAIData("CAM-000001"),
        "cam-db-2": {
          ...getDefaultAIData("CAM-000002"),
          behavior: {
            personCount: 1,
            behaviorState: "FALL_DETECTED",
            eventType: "PERSON_FALL",
            hasFall: true,
            hasFight: false,
          },
          riskScore: 85,
          riskLevel: "CRITICAL",
        },
        "cam-db-3": {
          ...getDefaultAIData("CAM-000003"),
          restrictedArea: {
            zoneStatus: "ALERT",
            hasBreach: true,
            activeIntrudersCount: 1,
            activeIntruders: [9],
          },
          riskScore: 90,
          riskLevel: "CRITICAL",
        },
        "cam-db-4": getDefaultAIData("CAM-000004"),
      };

      const count = calculateActiveAlertsCount(emptyAlerts, aiDataMap);
      expect(count).toBe(2); // CAM-2 (fall) and CAM-3 (breach)
    });

    it("returns 0 when all alerts are resolved and cameras are nominal", () => {
      const resolvedAlerts: CommandAlertItem[] = [
        {
          id: "alt-1",
          title: "Resolved Incident",
          severity: "HIGH",
          status: "RESOLVED",
          createdAt: new Date().toISOString(),
        },
      ];

      const aiDataMap = {
        "cam-db-1": getDefaultAIData("CAM-000001"),
        "cam-db-2": getDefaultAIData("CAM-000002"),
        "cam-db-3": getDefaultAIData("CAM-000003"),
        "cam-db-4": getDefaultAIData("CAM-000004"),
      };

      const count = calculateActiveAlertsCount(resolvedAlerts, aiDataMap);
      expect(count).toBe(0);
    });
  });

  describe("5. Event Deduplication & Bounded Timeline", () => {
    it("deduplicates events by ID and prepends incoming real-time items", () => {
      const existing: CommandEventItem[] = [
        {
          id: "evt-1",
          eventId: "EVT-001",
          eventType: "PERSON_DETECTED",
          severity: "LOW",
          detectedAt: "2026-09-23T10:00:00Z",
          status: "OPEN",
          source: "DETECTION",
          cameraId: "CAM-000001",
        },
        {
          id: "evt-2",
          eventId: "EVT-002",
          eventType: "OCCUPANCY_HIGH",
          severity: "MEDIUM",
          detectedAt: "2026-09-23T10:01:00Z",
          status: "OPEN",
          source: "DETECTION",
          cameraId: "CAM-000001",
        },
      ];

      const incoming: CommandEventItem[] = [
        {
          id: "evt-1", // duplicate of existing
          eventId: "EVT-001",
          eventType: "PERSON_DETECTED",
          severity: "LOW",
          detectedAt: "2026-09-23T10:00:00Z",
          status: "OPEN",
          source: "DETECTION",
          cameraId: "CAM-000001",
        },
        {
          id: "evt-3", // new event
          eventId: "EVT-003",
          eventType: "UNAUTHORIZED_ENTRY",
          severity: "CRITICAL",
          detectedAt: "2026-09-23T10:02:00Z",
          status: "OPEN",
          source: "DETECTION",
          cameraId: "CAM-000003",
        },
      ];

      const deduplicated = deduplicateEvents(existing, incoming, 20);
      expect(deduplicated).toHaveLength(3);
      expect(deduplicated[0].id).toBe("evt-3");
      expect(deduplicated[1].id).toBe("evt-2");
      expect(deduplicated[2].id).toBe("evt-1");
    });

    it("enforces maximum bounded history size", () => {
      const largeList: CommandEventItem[] = Array.from({ length: 30 }, (_, i) => ({
        id: `evt-${i}`,
        eventType: "PERSON_DETECTED",
        severity: "LOW",
        detectedAt: `2026-09-23T10:${i < 10 ? "0" + i : i}:00Z`,
        status: "OPEN",
        source: "DETECTION",
      }));

      const bounded = deduplicateEvents(largeList, [], 15);
      expect(bounded).toHaveLength(15);
      expect(bounded[0].id).toBe("evt-29");
    });
  });

  describe("6. Event Type Normalization & Schema Sanitization", () => {
    it("sanitizes arbitrary AI engine event strings to canonical MongoDB enum values", () => {
      expect(normalizeEventType("POTENTIAL_VIOLENT_ACTIVITY")).toBe("UNUSUAL_ACTIVITY");
      expect(normalizeEventType("OBJECT_MONITORING")).toBe("ABANDONED_OBJECT");
      expect(normalizeEventType("PERSON_FALL")).toBe("UNUSUAL_ACTIVITY");
      expect(normalizeEventType("SUSPICIOUS_BEHAVIOR")).toBe("UNUSUAL_ACTIVITY");
      expect(normalizeEventType("ZONE_MONITORING")).toBe("UNAUTHORIZED_ENTRY");
      expect(normalizeEventType("OCCUPANCY_HIGH")).toBe("OCCUPANCY_HIGH");
      expect(normalizeEventType("PERSON_DETECTED")).toBe("PERSON_DETECTED");
      expect(normalizeEventType("UNKNOWN_STRING")).toBe("OTHER");
      expect(normalizeEventType(null)).toBe("OTHER");
    });
  });
});
