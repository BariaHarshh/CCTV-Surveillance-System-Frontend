"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface OverlayDetection {
  trackId?: number | null;
  label: string;
  confidence?: number | null;
  status?: string;
  extraLabel?: string;
  timerSec?: number;
  boundingBox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface OverlayZone {
  name: string;
  status?: "SECURE" | "CHECKING" | "ALERT";
  severity?: string;
  polygon: { x: number; y: number }[];
}

export const DetectionOverlay = React.memo(function DetectionOverlay({
  detections = [],
  zones = [],
}: {
  detections?: OverlayDetection[];
  zones?: OverlayZone[];
}) {
  if (detections.length === 0 && zones.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1. Restricted Area Polygon Layer */}
      {zones.map((zone, i) => {
        if (!zone.polygon || zone.polygon.length < 3) return null;

        const zoneStatus = zone.status ?? "SECURE";
        const isAlert = zoneStatus === "ALERT";
        const isChecking = zoneStatus === "CHECKING";

        const fillColor = isAlert ? "rgba(239,68,68,0.22)" : isChecking ? "rgba(245,158,11,0.18)" : "rgba(16,185,129,0.12)";
        const strokeColor = isAlert ? "rgba(239,68,68,0.95)" : isChecking ? "rgba(245,158,11,0.85)" : "rgba(16,185,129,0.7)";
        const textColor = isAlert ? "#ef4444" : isChecking ? "#f59e0b" : "#10b981";

        return (
          <svg key={i} className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
            <polygon
              points={zone.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="0.006"
              strokeDasharray={isAlert ? "none" : "0.02 0.01"}
            />
            <text
              x={zone.polygon[0]?.x ?? 0.05}
              y={Math.max(0.04, (zone.polygon[0]?.y ?? 0.05) - 0.02)}
              fill={textColor}
              fontSize="0.035"
              fontWeight="bold"
              className="font-mono"
            >
              {zone.name} [{zone.status}]
            </text>
          </svg>
        );
      })}

      {/* 2. Structured Bounding Box & Track ID Layer */}
      {detections.map((d, i) => {
        if (!d.boundingBox) return null;
        const { x, y, w, h } = d.boundingBox;

        const s = String(d.status ?? "").toUpperCase();
        const isCritical =
          s.includes("FALL") ||
          s.includes("FIGHT") ||
          s.includes("ALERT") ||
          s.includes("ABANDONED") ||
          s.includes("CRITICAL") ||
          s.includes("INTRUDER") ||
          s.includes("BREACH");

        const isWarning =
          s.includes("CHECKING") ||
          s.includes("UNATTENDED") ||
          s.includes("SUSPICIOUS") ||
          s.includes("WARNING");

        const boxBorderClass = isCritical
          ? "border-2 border-red-500 bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
          : isWarning
          ? "border-2 border-amber-400 bg-amber-400/15 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
          : "border-2 border-emerald-400/90 bg-emerald-400/10";

        const badgeClass = isCritical
          ? "bg-red-500 text-white shadow-xs font-bold"
          : isWarning
          ? "bg-amber-400 text-black shadow-xs font-bold"
          : "bg-emerald-500/95 text-black font-semibold";

        // Construct label text with Track ID and extra label if available
        let mainTag = d.label || "Person";
        if (d.trackId != null) {
          mainTag = `${d.label.toUpperCase()} #${d.trackId}`;
        }

        let secondaryTag = "";
        if (d.extraLabel) {
          secondaryTag = d.extraLabel;
        } else if (d.timerSec != null && d.timerSec > 0) {
          secondaryTag = `${d.timerSec.toFixed(1)}s`;
        } else if (d.confidence != null && d.confidence > 0) {
          secondaryTag = `${Math.round(d.confidence * 100)}%`;
        }

        return (
          <div
            key={i}
            className={cn("absolute transition-all duration-200", boxBorderClass)}
            style={{
              left: `${Math.max(0, Math.min(1, x)) * 100}%`,
              top: `${Math.max(0, Math.min(1, y)) * 100}%`,
              width: `${Math.max(0, Math.min(1, w)) * 100}%`,
              height: `${Math.max(0, Math.min(1, h)) * 100}%`,
            }}
          >
            {/* Top Label Tag */}
            <span
              className={cn(
                "absolute -top-5 left-0 flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[9px] uppercase leading-none tracking-tight",
                badgeClass
              )}
            >
              <span>{mainTag}</span>
              {secondaryTag && <span className="opacity-90">• {secondaryTag}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
});
