"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, AlertTriangle, RefreshCw } from "lucide-react";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { MonitoringPortal } from "./MonitoringPortal";
import { CameraStreamView } from "./CameraStreamView";
import { CameraStatusDot, RealtimeIndicator, formatTime, formatEventType } from "./shared";
import { useMonitoringSocket } from "@/hooks/useMonitoringSocket";
import { cn } from "@/lib/utils";

interface CameraItem {
  id: string;
  cameraId: string;
  name: string;
  status: string;
  type?: string;
  lastSeen: string | null;
  location: { building?: string; room?: string; areaLabel?: string };
  capacity?: number;
}

interface DetectionMetadata {
  currentCount?: number;
  stableCount?: number;
  capacity?: number;
  threshold?: number;
  crowdState?: "NORMAL" | "CHECKING CROWD" | "CROWD DETECTED" | string;
  occupancyPercentage?: number;
  boundingBox?: { x: number; y: number; w: number; h: number };
  [key: string]: unknown;
}

interface EventRow {
  id: string;
  eventId: string;
  eventType: string;
  severity: string;
  confidence: number | null;
  detectedAt: string;
  status: string;
  source: string;
  metadata?: DetectionMetadata;
}

interface CameraCrowdData {
  currentCount: number;
  stableCount: number;
  capacity: number;
  crowdState: "NORMAL" | "CHECKING CROWD" | "CROWD DETECTED";
  lastUpdate: string | null;
  detections: { label: string; confidence?: number | null; boundingBox?: { x: number; y: number; w: number; h: number } }[];
}

const DEFAULT_CROWD_DATA: CameraCrowdData = {
  currentCount: 0,
  stableCount: 0,
  capacity: 10,
  crowdState: "NORMAL",
  lastUpdate: null,
  detections: [],
};

const MonitoringCameraCard = React.memo(function MonitoringCameraCard({
  camera,
  crowdData,
}: {
  camera: CameraItem;
  crowdData: CameraCrowdData;
}) {
  const capacityPct = Math.min(100, Math.round((crowdData.currentCount / (crowdData.capacity || 1)) * 100));

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/50 p-4 transition-all hover:border-accent/30">
      {/* Camera Card Top Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-foreground">{camera.name}</span>
          <span className="rounded-full bg-glass px-2 py-0.5 font-mono text-[10px] text-muted">{camera.cameraId}</span>
        </div>
        <div className="flex items-center gap-2">
          <CameraStatusDot status={camera.status} />
          <span className={cn(
            "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
            crowdData.crowdState === "CROWD DETECTED" ? "bg-red-500/20 text-red-400" :
            crowdData.crowdState === "CHECKING CROWD" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
          )}>
            {crowdData.crowdState}
          </span>
        </div>
      </div>

      {/* Independent Direct Video Stream Container */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <CameraStreamView
          cameraDbId={camera.id}
          status={camera.status}
          className="w-full"
          detections={crowdData.detections}
        />
      </div>

      {/* Location & Time Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
        <span className="truncate">
          {[camera.location.building, camera.location.room, camera.location.areaLabel].filter(Boolean).join(" · ") || "Main Campus Area"}
        </span>
        <span>{crowdData.lastUpdate ? formatTime(crowdData.lastUpdate) : "Live"}</span>
      </div>

      {/* Crowd Analytics HUD */}
      <div className="mt-3 rounded-xl border border-border bg-glass p-3.5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <span className="block text-[10px] font-medium uppercase text-muted">YOLOv8 Count</span>
            <span className="mt-0.5 block font-mono text-xl font-extrabold text-foreground">
              {crowdData.currentCount}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase text-muted">ByteTrack Stable</span>
            <span className="mt-0.5 block font-mono text-xl font-extrabold text-accent">
              {crowdData.stableCount}
            </span>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted">
            <span>Occupancy Capacity</span>
            <span className="font-mono text-foreground">{crowdData.currentCount} / {crowdData.capacity} ({capacityPct}%)</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                capacityPct >= 100 ? "bg-red-500" :
                capacityPct >= 70 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${capacityPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export function LiveAIMonitoringClient({
  user,
  portal,
}: {
  user: SafeUser;
  portal: "admin" | "staff";
  initialCameraId?: string;
}) {
  const base = portal === "admin" ? "/admin" : "/staff";
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [crowdDataMap, setCrowdDataMap] = useState<Record<string, CameraCrowdData>>({});
  const [, setEventsMap] = useState<Record<string, EventRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const camerasRef = useRef<CameraItem[]>([]);
  camerasRef.current = cameras;

  // Fetch details for all cameras in parallel
  const loadAllCameraDetails = useCallback(async (cameraList: CameraItem[]) => {
    try {
      const detailsMap: Record<string, CameraCrowdData> = {};
      const events: Record<string, EventRow[]> = {};

      await Promise.all(
        cameraList.map(async (cam) => {
          try {
            const res = await fetch(`/api/monitoring/cameras/${cam.id}`, { credentials: "include" });
            const data = await res.json();
            if (res.ok) {
              const fetchedEvents: EventRow[] = data.recentEvents ?? [];
              events[cam.id] = fetchedEvents;

              const crowdEvent = fetchedEvents.find(
                (e) => e.eventType === "OCCUPANCY_HIGH" || e.eventType === "PERSON_DETECTED" || e.metadata?.currentCount !== undefined
              );

              if (crowdEvent?.metadata) {
                const meta = crowdEvent.metadata;
                const currentCount = Number(meta.currentCount ?? 0);
                const capacity = Number(meta.capacity ?? meta.threshold ?? 10);
                let crowdState: "NORMAL" | "CHECKING CROWD" | "CROWD DETECTED" = "NORMAL";

                if (meta.crowdState) {
                  const s = String(meta.crowdState).toUpperCase();
                  if (s.includes("CROWD DETECTED") || s.includes("HIGH") || s.includes("CRITICAL")) {
                    crowdState = "CROWD DETECTED";
                  } else if (s.includes("CHECKING") || s.includes("ELEVATED") || s.includes("MEDIUM")) {
                    crowdState = "CHECKING CROWD";
                  }
                } else if (currentCount >= capacity) {
                  crowdState = "CROWD DETECTED";
                } else if (currentCount >= Math.floor(capacity * 0.7)) {
                  crowdState = "CHECKING CROWD";
                }

                const detections = meta.boundingBox
                  ? [{ label: formatEventType(crowdEvent.eventType), confidence: crowdEvent.confidence, boundingBox: meta.boundingBox }]
                  : [];

                detailsMap[cam.id] = {
                  currentCount,
                  stableCount: Number(meta.stableCount ?? currentCount),
                  capacity,
                  crowdState,
                  lastUpdate: crowdEvent.detectedAt,
                  detections,
                };
              }
            }
          } catch {
            // Ignore individual camera details load failure so other cameras load cleanly
          }
        })
      );

      setCrowdDataMap((prev) => ({ ...prev, ...detailsMap }));
      setEventsMap((prev) => ({ ...prev, ...events }));
    } catch {
      // Ignore batch details error
    }
  }, []);

  // Load available camera list
  const loadCameras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/monitoring/cameras", { credentials: "include" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.cameras)) {
        setCameras(data.cameras);
        if (data.cameras.length > 0) {
          await loadAllCameraDetails(data.cameras);
        }
      } else {
        setError(data.error || "Failed to load camera list");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error connecting to camera monitoring API");
    } finally {
      setLoading(false);
    }
  }, [loadAllCameraDetails]);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  // Realtime Socket.IO handler
  const { status: realtimeStatus } = useMonitoringSocket({
    onCameraStatus: (payload) => {
      const camId = (payload.cameraId as string) || (payload.id as string);
      setCameras((prev) =>
        prev.map((c) => (c.id === camId || c.cameraId === camId ? { ...c, status: String(payload.status ?? c.status) } : c))
      );
    },
    onDetectionCreated: (payload) => {
      const payloadCamId = payload.cameraId as string;
      const meta = (payload.metadata as DetectionMetadata) || {};

      setCrowdDataMap((prevMap) => {
        const matchingCam = camerasRef.current.find(
          (c) => c.id === payloadCamId || c.cameraId === payloadCamId || meta.cameraId === c.cameraId
        );
        if (!matchingCam) return prevMap;

        const camKey = matchingCam.id;
        const existing = prevMap[camKey] || DEFAULT_CROWD_DATA;

        const count = Number(meta.currentCount ?? existing.currentCount);
        const cap = Number(meta.capacity ?? meta.threshold ?? existing.capacity);
        let state: "NORMAL" | "CHECKING CROWD" | "CROWD DETECTED" = "NORMAL";

        if (meta.crowdState) {
          const s = String(meta.crowdState).toUpperCase();
          if (s.includes("CROWD DETECTED") || s.includes("HIGH") || s.includes("CRITICAL")) {
            state = "CROWD DETECTED";
          } else if (s.includes("CHECKING") || s.includes("ELEVATED") || s.includes("MEDIUM")) {
            state = "CHECKING CROWD";
          }
        } else if (count >= cap) {
          state = "CROWD DETECTED";
        } else if (count >= Math.floor(cap * 0.7)) {
          state = "CHECKING CROWD";
        }

        const detections = meta.boundingBox
          ? [{ label: "Person", confidence: 0.9, boundingBox: meta.boundingBox }]
          : existing.detections;

        return {
          ...prevMap,
          [camKey]: {
            currentCount: count,
            stableCount: Number(meta.stableCount ?? count),
            capacity: cap,
            crowdState: state,
            lastUpdate: new Date().toISOString(),
            detections,
          },
        };
      });
    },
    onEventCreated: (payload) => {
      const payloadCamId = payload.cameraId as string;
      const targetCam = camerasRef.current.find((c) => c.id === payloadCamId || c.cameraId === payloadCamId);
      if (targetCam) {
        fetch(`/api/monitoring/cameras/${targetCam.id}`, { credentials: "include" })
          .then((r) => r.json())
          .then((data) => {
            if (data.recentEvents) {
              setEventsMap((prev) => ({ ...prev, [targetCam.id]: data.recentEvents }));
            }
          })
          .catch(() => {});
      }
    },
  });

  return (
    <MonitoringPortal portal={portal} user={user}>
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`${base}/monitoring`} className="text-xs text-muted hover:text-accent">
              ← Monitoring Overview
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">Live AI Crowd Monitoring Wall</h1>
          <p className="mt-1 text-xs text-muted">
            Multi-camera real-time AI video feeds and occupancy analytics ({cameras.length} Active Cameras).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <RealtimeIndicator status={realtimeStatus} />
          <button
            type="button"
            onClick={() => loadCameras()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Wall
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
          <h3 className="mt-2 font-semibold text-red-300">Camera Wall Unavailable</h3>
          <p className="mt-1 text-xs text-muted">{error}</p>
        </div>
      ) : cameras.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
          <Camera className="mx-auto h-12 w-12 text-muted" />
          <h3 className="mt-3 text-base font-semibold">No Monitoring Cameras Registered</h3>
          <p className="mt-1 text-xs text-muted">
            No active cameras are currently configured in MongoDB Atlas. Register cameras to view live AI video feeds.
          </p>
        </div>
      ) : (
        /* Multi-Camera 2-Column Responsive Grid */
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {cameras.map((camera) => (
            <MonitoringCameraCard
              key={camera.id}
              camera={camera}
              crowdData={crowdDataMap[camera.id] || DEFAULT_CROWD_DATA}
            />
          ))}
        </div>
      )}
    </MonitoringPortal>
  );
}
