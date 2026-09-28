"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Camera,
  Clock,
  Eye,
  Maximize2,
  Package,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { useMonitoringSocket } from "@/hooks/useMonitoringSocket";
import { useCriticalAlertSound, useSoundNotificationsEnabled } from "@/hooks/useCriticalAlertSound";
import { CriticalAlertBanner } from "./CriticalAlertBanner";
import { MonitoringPortal } from "./MonitoringPortal";
import {
  CameraStatusDot,
  RealtimeIndicator,
  SeverityBadge,
  formatEventType,
  formatTime,
} from "./shared";
import { CameraStreamView } from "./CameraStreamView";
import { cn } from "@/lib/utils";
import {
  type CameraAIData,
  getDefaultAIData,
  parseAIDataFromPayload,
} from "@/lib/monitoring/ai-metadata-parser";
import {
  type CommandAlertItem,
  type CommandCameraItem,
  type CommandEventItem,
  calculateActiveAlertsCount,
  calculateOverallRisk,
  deduplicateEvents,
  getAIFeatureLabel,
  getCameraDisplayName,
} from "@/lib/monitoring/command-center-utils";

/* =========================================================================
   Severity colours (shared across sub-components)
   ========================================================================= */
const RISK_BORDER: Record<string, string> = {
  CRITICAL: "border-red-500/60 shadow-[0_0_18px_rgba(239,68,68,0.2)] ring-1 ring-red-500/40",
  HIGH: "border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.15)]",
  MEDIUM: "border-amber-500/40",
  LOW: "border-border",
};

const RISK_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const RISK_DOT: Record<string, string> = {
  CRITICAL: "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse",
  HIGH: "bg-orange-400",
  MEDIUM: "bg-amber-400",
  LOW: "bg-emerald-400",
};

/* =========================================================================
   1. Top Status Banner
   ========================================================================= */
interface StatusBannerProps {
  onlineCount: number;
  totalCount: number;
  activeAlertsCount: number;
  overallRiskScore: number;
  overallRiskLevel: string;
  realtimeStatus: "connected" | "disconnected" | "reconnecting";
  refreshing: boolean;
  onRefresh: () => void;
  base: string;
  soundEnabled: boolean;
  onToggleSound: (v: boolean) => void;
  overview: {
    cameras: { total: number; online: number; offline: number };
    events: { active: number };
    alerts: { critical: number; unresolved: number };
  } | null;
}

const StatusBanner = React.memo(function StatusBanner({
  onlineCount,
  totalCount,
  activeAlertsCount,
  overallRiskScore,
  overallRiskLevel,
  realtimeStatus,
  refreshing,
  onRefresh,
  base,
  soundEnabled,
  onToggleSound,
  overview,
}: StatusBannerProps) {
  const isCritical = overallRiskLevel === "CRITICAL" || activeAlertsCount > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-accent/70">
            AI CAMPUS GUARDIAN
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight lg:text-3xl">
            Security Command Center
          </h1>
          <p className="mt-1 text-xs text-muted">
            Real-time AI-powered campus surveillance and risk monitoring.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* SYSTEM ONLINE */}
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              SYSTEM ONLINE
            </span>
            {/* AI ENGINE ONLINE */}
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              AI ENGINE ONLINE
            </span>
            {/* CAMERAS ONLINE */}
            <span className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold",
              onlineCount === totalCount
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", onlineCount === totalCount ? "bg-emerald-500" : "bg-amber-500")} />
              {onlineCount}/{totalCount} CAMERAS ONLINE
            </span>
            {/* REAL-TIME STATUS */}
            <span className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold",
              realtimeStatus === "connected"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : realtimeStatus === "reconnecting"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            )}>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                realtimeStatus === "connected" ? "bg-emerald-500" :
                realtimeStatus === "reconnecting" ? "bg-amber-500" : "bg-red-500"
              )} />
              {realtimeStatus === "connected" ? "REAL‑TIME CONNECTED" :
               realtimeStatus === "reconnecting" ? "REAL‑TIME RECONNECTING" :
               "REAL‑TIME DISCONNECTED"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-border bg-glass px-3 py-1.5 shadow-sm">
            <RealtimeIndicator status={realtimeStatus} />
          </div>
          <Link
            href={`${base}/monitoring/live`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            AI Live Feed
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted shadow-sm transition-all hover:bg-glass hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-accent")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => onToggleSound(!soundEnabled)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
              soundEnabled
                ? "border-accent/30 text-accent hover:bg-accent/5"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            Sound {soundEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* KPI metric strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {/* Cameras Online */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Camera className="h-3.5 w-3.5 text-accent" /> Online
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black text-foreground">{onlineCount}</span>
            <span className="font-mono text-sm text-muted">/ {totalCount}</span>
          </div>
        </div>

        {/* Cameras Offline */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Eye className="h-3.5 w-3.5 text-slate-400" /> Offline
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={cn("font-mono text-2xl font-black", totalCount - onlineCount > 0 ? "text-amber-400" : "text-foreground")}>
              {totalCount - onlineCount}
            </span>
          </div>
        </div>

        {/* Active Alerts */}
        <div
          className={cn(
            "flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition-colors",
            activeAlertsCount > 0
              ? "border-red-500/40 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
              : "border-border bg-surface/60"
          )}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            {activeAlertsCount > 0 ? (
              <ShieldAlert className="h-3.5 w-3.5 animate-pulse text-red-400" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            )}
            Active Alerts
          </span>
          <span className={cn("mt-2 font-mono text-2xl font-black", activeAlertsCount > 0 ? "text-red-400" : "text-foreground")}>
            {activeAlertsCount}
          </span>
        </div>

        {/* Critical Alerts */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <AlertOctagon className="h-3.5 w-3.5 text-red-400" /> Critical
          </span>
          <span className={cn("mt-2 font-mono text-2xl font-black", (overview?.alerts.critical ?? 0) > 0 ? "text-red-400" : "text-foreground")}>
            {overview?.alerts.critical ?? 0}
          </span>
        </div>

        {/* Active Events */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Activity className="h-3.5 w-3.5 text-accent" /> Events
          </span>
          <span className="mt-2 font-mono text-2xl font-black text-foreground">
            {overview?.events.active ?? 0}
          </span>
        </div>

        {/* Campus Risk */}
        <div
          className={cn(
            "flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition-colors",
            isCritical
              ? "border-red-500/40 bg-red-500/10"
              : overallRiskLevel === "HIGH"
              ? "border-orange-500/40 bg-orange-500/10"
              : "border-border bg-surface/60"
          )}
        >
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Campus Risk
          </span>
          <div className="mt-2 flex items-baseline justify-between gap-1">
            <span className="font-mono text-2xl font-black text-foreground">{overallRiskScore}</span>
            <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase", RISK_BADGE[overallRiskLevel] ?? RISK_BADGE.LOW)}>
              {overallRiskLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   2. Risk Distribution Bar
   ========================================================================= */
function RiskDistributionBar({ aiDataMap }: { aiDataMap: Record<string, CameraAIData> }) {
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const d of Object.values(aiDataMap)) {
      const lvl = d.riskLevel as keyof typeof c;
      if (lvl in c) c[lvl]++;
    }
    return c;
  }, [aiDataMap]);

  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="rounded-xl border border-border bg-surface/50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <Shield className="h-3.5 w-3.5 text-accent" /> Risk Distribution
        </span>
        <span className="font-mono text-[10px] text-muted">{total} camera{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Horizontal bar rows */}
      <div className="flex flex-col gap-2">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((lvl) => {
          const pct = Math.round((counts[lvl] / total) * 100);
          const barColor =
            lvl === "CRITICAL" ? "bg-red-500" :
            lvl === "HIGH"     ? "bg-orange-500" :
            lvl === "MEDIUM"   ? "bg-amber-500" :
                                 "bg-emerald-500";
          const textColor =
            lvl === "CRITICAL" ? "text-red-400" :
            lvl === "HIGH"     ? "text-orange-400" :
            lvl === "MEDIUM"   ? "text-amber-400" :
                                 "text-emerald-400";
          return (
            <div key={lvl} className="flex items-center gap-2">
              {/* Level label */}
              <span className="w-16 shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-muted">
                {lvl}
              </span>
              {/* Bar track */}
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", barColor)}
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
              {/* Count */}
              <span className={cn("w-5 shrink-0 text-right font-mono text-xs font-extrabold", textColor)}>
                {counts[lvl]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   3. Active Alerts Panel
   ========================================================================= */
const ActiveAlertsPanel = React.memo(function ActiveAlertsPanel({
  alerts,
  base,
  onCameraFocus,
}: {
  alerts: CommandAlertItem[];
  base: string;
  onCameraFocus: (id: string) => void;
}) {
  const active = useMemo(() => alerts.filter((a) => a.status !== "RESOLVED" && a.status !== "DISMISSED"), [alerts]);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface/50 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className={cn("h-4 w-4", active.length > 0 ? "animate-pulse text-red-400" : "text-emerald-400")} />
          <h2 className="text-sm font-bold uppercase tracking-tight">ACTIVE ALERTS</h2>
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase", active.length > 0 ? "border-red-500/30 bg-red-500/20 text-red-400" : "border-emerald-500/30 bg-emerald-500/20 text-emerald-400")}>
          {active.length} ACTIVE
        </span>
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 py-10 text-center">
          <ShieldCheck className="h-9 w-9 text-emerald-400" />
          <h3 className="mt-2 text-sm font-semibold text-emerald-300">ALL CLEAR</h3>
          <p className="mt-1 max-w-xs text-xs text-muted">No active security events across all camera pipelines.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {active.slice(0, 8).map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => alert.cameraId && onCameraFocus(alert.cameraId)}
              className={cn(
                "flex w-full items-stretch gap-0 rounded-xl border text-left transition-all hover:brightness-110",
                alert.severity === "CRITICAL"
                  ? "border-red-500/40 bg-red-500/10 shadow-[0_0_8px_rgba(239,68,68,0.1)]"
                  : alert.severity === "HIGH"
                  ? "border-orange-500/40 bg-orange-500/10"
                  : "border-border bg-glass/40"
              )}
            >
              {/* Severity indicator bar */}
              <span
                className={cn(
                  "w-1 shrink-0 rounded-l-xl",
                  alert.severity === "CRITICAL"
                    ? "bg-red-500"
                    : alert.severity === "HIGH"
                    ? "bg-orange-500"
                    : alert.severity === "MEDIUM"
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
              />
              {/* Main content */}
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  {/* Row 1: severity badge + title */}
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <p className="truncate text-xs font-semibold text-foreground">{alert.title}</p>
                  </div>
                  {/* Row 2: camera + status */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-accent/80 truncate">
                      {alert.cameraName || alert.cameraId || "CAMPUS"}
                    </span>
                    <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted">
                      {alert.status}
                    </span>
                  </div>
                </div>
                {/* Timestamp */}
                <span className="shrink-0 font-mono text-[11px] text-muted pt-0.5">
                  {formatTime(alert.createdAt)}
                </span>
              </div>
            </button>
          ))}
          {active.length > 8 && (
            <Link href={`${base}/alerts`} className="block text-center text-xs text-accent hover:underline pt-1">
              + {active.length - 8} more alerts →
            </Link>
          )}
        </div>
      )}
    </div>
  );
});

/* =========================================================================
   4. Event Timeline Panel
   ========================================================================= */
const EventTimelinePanel = React.memo(function EventTimelinePanel({
  events,
  base,
}: {
  events: CommandEventItem[];
  base: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface/50 p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold uppercase tracking-tight">RECENT AI EVENTS</h2>
        </div>
        <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent">
          REAL-TIME
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 py-10 text-center">
          <Clock className="h-9 w-9 text-muted" />
          <p className="mt-2 text-xs font-medium text-muted">No recent events recorded</p>
          <p className="mt-0.5 text-[11px] text-muted/60">Events appear here as AI detections occur</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.slice(0, 12).map((e) => (
            <Link
              key={e.id}
              href={`${base}/events/${e.id}`}
              className="flex items-stretch gap-0 rounded-xl border border-border/80 bg-glass/60 transition-all hover:brightness-105"
            >
              {/* Left severity bar */}
              <span
                className={cn(
                  "w-1 shrink-0 rounded-l-xl",
                  e.severity === "CRITICAL" ? "bg-red-500" :
                  e.severity === "HIGH"     ? "bg-orange-500" :
                  e.severity === "MEDIUM"   ? "bg-amber-500" :
                                             "bg-emerald-500"
                )}
              />
              {/* Row content */}
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  {/* Event type + severity badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        e.severity === "CRITICAL" ? "bg-red-400" :
                        e.severity === "HIGH"     ? "bg-orange-400" :
                        e.severity === "MEDIUM"   ? "bg-amber-400" :
                                                   "bg-emerald-400"
                      )}
                    />
                    <span className="truncate font-mono text-xs font-semibold text-foreground">
                      {formatEventType(e.eventType)}
                    </span>
                    <SeverityBadge severity={e.severity} />
                  </div>
                  {/* Camera chip */}
                  <span className="font-mono text-[10px] text-accent/70 truncate">
                    {e.cameraName || e.cameraId || "Camera"}
                  </span>
                </div>
                {/* Timestamp — right-aligned top */}
                <span className="shrink-0 pt-0.5 font-mono text-[11px] text-muted">
                  {formatTime(e.detectedAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});

/* =========================================================================
   5. Camera Card (enhanced — keeps lazy stream behaviour)
   ========================================================================= */
const CameraCard = React.memo(function CameraCard({
  cam,
  aiData,
  expanded,
  onExpand,
  base,
}: {
  cam: CommandCameraItem;
  aiData: CameraAIData;
  expanded: boolean;
  onExpand: () => void;
  base: string;
}) {
  const riskLevel = aiData.riskLevel || "LOW";
  const riskScore = aiData.riskScore ?? 0;
  const isCritical = riskLevel === "CRITICAL" || aiData.behavior?.hasFall || aiData.behavior?.hasFight || aiData.restrictedArea?.hasBreach || aiData.abandonedObject?.objectStatus === "ABANDONED";
  const aiFeature = getAIFeatureLabel(cam.cameraId, aiData.moduleType);

  // Derive a short status string from AI data
  let aiStatusText = "NOMINAL";
  let aiStatusClass = "bg-emerald-500/20 text-emerald-400";
  if (aiData.behavior?.hasFall) { aiStatusText = "FALL DETECTED"; aiStatusClass = "bg-red-500/20 text-red-400 animate-pulse"; }
  else if (aiData.behavior?.hasFight) { aiStatusText = "FIGHT DETECTED"; aiStatusClass = "bg-red-500/20 text-red-400 animate-pulse"; }
  else if (aiData.restrictedArea?.hasBreach) { aiStatusText = "BREACH ALERT"; aiStatusClass = "bg-red-500/20 text-red-400 animate-pulse"; }
  else if (aiData.abandonedObject?.objectStatus === "ABANDONED") { aiStatusText = "ABANDONED OBJ"; aiStatusClass = "bg-red-500/20 text-red-400 animate-pulse"; }
  else if (aiData.crowd?.crowdDetected) { aiStatusText = "CROWD DETECTED"; aiStatusClass = "bg-amber-500/20 text-amber-400"; }
  else if (aiData.abandonedObject?.objectStatus === "UNATTENDED") { aiStatusText = "UNATTENDED"; aiStatusClass = "bg-amber-500/20 text-amber-400"; }
  else if (aiData.restrictedArea?.zoneStatus === "CHECKING") { aiStatusText = "CHECKING"; aiStatusClass = "bg-amber-500/20 text-amber-400"; }
  else if (riskLevel === "HIGH") { aiStatusText = "ELEVATED RISK"; aiStatusClass = "bg-orange-500/20 text-orange-400"; }
  else if (riskLevel === "MEDIUM") { aiStatusText = "MONITORING"; aiStatusClass = "bg-amber-500/20 text-amber-400"; }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-surface/60 transition-all duration-300",
        RISK_BORDER[riskLevel] ?? RISK_BORDER.LOW
      )}
    >
      {/* Card Header */}
      <div className="border-b border-border/60 p-3.5 flex flex-col gap-0">

        {/* ── IDENTITY ─────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Camera className="h-3 w-3 shrink-0 text-muted/50" />
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted truncate">{cam.cameraId}</p>
          </div>
          <span className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
            cam.status === "ONLINE"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-slate-500/30 bg-slate-500/10 text-slate-400"
          )}>
            <span className={cn(
              "mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle",
              cam.status === "ONLINE" ? "bg-emerald-500" : "bg-slate-500"
            )} />
            {cam.status}
          </span>
        </div>

        {/* Camera name */}
        <h3 className="mt-1.5 text-sm font-extrabold text-foreground leading-tight truncate">{cam.name}</h3>

        {/* Location */}
        <p className="mt-0.5 font-mono text-[10px] text-muted/60 truncate">
          {[cam.location?.building, cam.location?.room, cam.location?.areaLabel].filter(Boolean).join(" · ") || "Campus Area"}
        </p>

        {/* Divider */}
        <div className="my-2.5 border-t border-border/40" />

        {/* ── AI STATUS ────────────────────────────────── */}
        <p className="mb-1 font-mono text-[8px] font-bold uppercase tracking-widest text-muted/40">AI STATUS</p>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent truncate max-w-[55%]">
            {aiData.moduleType || "AI MODULE"}
          </span>
          <span className={cn("shrink-0 rounded-md px-2 py-0.5 font-mono text-[9px] font-bold uppercase", aiStatusClass)}>
            {aiStatusText}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted/60 truncate">{aiFeature}</p>

        {/* Divider */}
        <div className="my-2 border-t border-border/40" />

        {/* ── RISK ─────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-muted/50 shrink-0" />
            <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-muted/40">RISK</p>
          </div>
          <span className={cn("shrink-0 rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase", RISK_BADGE[riskLevel] ?? RISK_BADGE.LOW)}>
            {riskLevel} · {riskScore}
          </span>
        </div>

        {/* ── ALERT / TIMESTAMP ────────────────────────── */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {isCritical ? (
            <span className="flex items-center gap-1 rounded-md bg-red-500/15 border border-red-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-400">
              <AlertOctagon className="h-3 w-3 shrink-0" /> ALERT ACTIVE
            </span>
          ) : (
            <span />
          )}
          {aiData.lastUpdate && (
            <span className="flex items-center gap-1 font-mono text-[9px] text-muted/50">
              <Clock className="h-2.5 w-2.5 shrink-0" />
              {formatTime(aiData.lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* Video area — lazy on-demand */}
      <div className="p-3">
        {expanded ? (
          <CameraStreamView
            cameraDbId={cam.id}
            status={cam.status}
            detections={aiData.detections}
            zones={aiData.zones}
          />
        ) : (
          <button
            type="button"
            onClick={onExpand}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-8 text-xs font-semibold tracking-wider transition-all",
              cam.status === "ONLINE"
                ? "border-accent/30 text-accent hover:border-accent/60 hover:bg-accent/5"
                : "border-border text-muted cursor-not-allowed"
            )}
          >
            {cam.status === "ONLINE" ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                LIVE VIEW
              </>
            ) : (
              "CAMERA OFFLINE"
            )}
          </button>
        )}
      </div>

      {/* Footer link */}
      <div className="flex border-t border-border/60">
        <Link
          href={`${base}/monitoring/cameras/${cam.id}`}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs text-muted transition-colors hover:text-accent"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Full Detail
        </Link>
      </div>
    </motion.div>
  );
});

/* =========================================================================
   6. Monitoring Test Mode (dev-only)
   ========================================================================= */
function TestModePanel({ cameraId }: { cameraId?: string }) {
  const [open, setOpen] = useState(false);

  async function runTest(action: string) {
    await fetch("/api/monitoring/test", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, cameraId }),
    });
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <button type="button" onClick={() => setOpen(!open)} className="text-xs font-semibold text-amber-400">
        Monitoring Test Mode {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "test_event", "test_critical_alert", "camera_online", "camera_offline",
            "test_person", "test_occupancy", "test_restricted_entry", "test_after_hours",
            "test_abandoned_object", "test_fire", "test_smoke", "test_ppe", "test_tamper",
            "test_full_chain", "test_emergency", "test_escalation", "test_team_assignment",
            "test_task", "test_websocket_emergency", "test_emergency_resolve",
          ].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => runTest(a)}
              className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300 hover:bg-amber-500/20"
            >
              {a.replace(/_/g, " ")}
            </button>
          ))}
          <p className="w-full text-[10px] text-muted">Requires MONITORING_TEST_MODE=true. All items marked source: TEST.</p>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   7. Main MonitoringClient
   ========================================================================= */
export function MonitoringClient({ user, portal }: { user: SafeUser; portal: "admin" | "staff" }) {
  const base = portal === "admin" ? "/admin" : "/staff";

  // ── State ──────────────────────────────────────────────────────────────────
  const [cameras, setCameras] = useState<CommandCameraItem[]>([]);
  const [aiDataMap, setAiDataMap] = useState<Record<string, CameraAIData>>({});
  const [activeAlerts, setActiveAlerts] = useState<CommandAlertItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<CommandEventItem[]>([]);
  const [overview, setOverview] = useState<{
    cameras: { total: number; online: number; offline: number };
    events: { active: number };
    alerts: { critical: number; unresolved: number };
  } | null>(null);
  const [overviewRiskScore, setOverviewRiskScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [criticalBanner, setCriticalBanner] = useState<Record<string, unknown> | null>(null);
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundNotificationsEnabled();
  const { play: playCriticalSound } = useCriticalAlertSound(soundEnabled);

  // Stable refs to avoid stale closures in Socket.IO handlers
  const camerasRef = useRef<CommandCameraItem[]>([]);
  camerasRef.current = cameras;
  const aiDataMapRef = useRef<Record<string, CameraAIData>>({});
  aiDataMapRef.current = aiDataMap;

  // ── Data loading ───────────────────────────────────────────────────────────
  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner && camerasRef.current.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [camRes, alertRes, evtRes, ovRes] = await Promise.all([
        fetch("/api/monitoring/cameras", { credentials: "include" }),
        fetch("/api/alerts?limit=20", { credentials: "include" }),
        fetch("/api/events?limit=20", { credentials: "include" }),
        fetch("/api/monitoring/overview", { credentials: "include" }),
      ]);

      const [camData, alertData, evtData, ovData] = await Promise.all([
        camRes.json(),
        alertRes.json(),
        evtRes.json(),
        ovRes.json(),
      ]);

      if (camRes.ok && Array.isArray(camData.cameras)) {
        const loadedCams: CommandCameraItem[] = camData.cameras;
        setCameras(loadedCams);

        // Seed AI data with defaults without overwriting active live Socket.IO data
        const detailsMap: Record<string, CameraAIData> = {};
        await Promise.all(
          loadedCams.map(async (cam) => {
            const existing = aiDataMapRef.current[cam.id] || aiDataMapRef.current[cam.cameraId];
            detailsMap[cam.id] = existing || getDefaultAIData(cam.cameraId);
            detailsMap[cam.cameraId] = detailsMap[cam.id];
            try {
              const r = await fetch(`/api/monitoring/cameras/${cam.id}`, { credentials: "include" });
              const d = await r.json();
              if (r.ok && Array.isArray(d.recentEvents) && d.recentEvents.length > 0) {
                const meta = (d.recentEvents[0].metadata as Record<string, unknown>) || {};
                // Only seed from DB if no live Socket.IO detections have arrived
                if (!existing || (!existing.lastUpdate && existing.detections.length === 0)) {
                  const parsed = parseAIDataFromPayload(
                    cam.cameraId,
                    meta.moduleType as string,
                    meta,
                    detailsMap[cam.id]
                  );
                  detailsMap[cam.id] = parsed;
                  detailsMap[cam.cameraId] = parsed;
                }
              }
            } catch {
              // keep defaults on individual failure
            }
          })
        );
        setAiDataMap((prev) => {
          const merged = { ...detailsMap };
          // Preserve all existing live states that arrived via Socket.IO
          for (const [key, val] of Object.entries(prev)) {
            if (val.lastUpdate || val.detections.length > 0) {
              merged[key] = val;
            }
          }
          return merged;
        });
      }

      if (alertRes.ok && Array.isArray(alertData.alerts)) setActiveAlerts(alertData.alerts);
      if (evtRes.ok && Array.isArray(evtData.events)) setRecentEvents(evtData.events);

      if (ovRes.ok && ovData.overview) {
        const ov = ovData.overview;
        setOverview({
          cameras: { total: ov.cameras?.total ?? 0, online: ov.cameras?.online ?? 0, offline: ov.cameras?.offline ?? 0 },
          events: { active: ov.events?.active ?? 0 },
          alerts: { critical: ov.alerts?.critical ?? 0, unresolved: ov.alerts?.unresolved ?? 0 },
        });
        if (ov.currentRisk?.score != null) setOverviewRiskScore(Number(ov.currentRisk.score));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    if (process.env.NODE_ENV === "development") {
      fetch("/api/monitoring/test", { method: "OPTIONS" }).catch(() => {});
    }
  }, [load]);

  // ── Socket.IO real-time updates ────────────────────────────────────────────
  const { status: realtimeStatus } = useMonitoringSocket({
    onCameraStatus: (payload) => {
      const camId = (payload.cameraId as string) || (payload.id as string);
      setCameras((prev) =>
        prev.map((c) =>
          c.id === camId || c.cameraId === camId
            ? { ...c, status: String(payload.status ?? c.status) }
            : c
        )
      );
    },
    onDetectionCreated: (payload) => {
      const payloadCamId = payload.cameraId as string;
      const meta = (payload.metadata as Record<string, unknown>) || {};
      setAiDataMap((prevMap) => {
        const match = camerasRef.current.find(
          (c) => c.id === payloadCamId || c.cameraId === payloadCamId || meta.cameraId === c.cameraId || meta.cameraId === c.id
        );
        const camKey = match ? match.id : payloadCamId;
        const camCode = match ? match.cameraId : payloadCamId;
        const existing = prevMap[camKey] || prevMap[camCode] || getDefaultAIData(camCode);
        const nextData = parseAIDataFromPayload(
          camCode,
          (payload.moduleType as string) || (meta.moduleType as string),
          meta,
          existing
        );
        return {
          ...prevMap,
          [camKey]: nextData,
          [camCode]: nextData,
        };
      });
    },
    onEventCreated: (payload) => {
      const camCode = String(payload.cameraId || "");
      const camName = getCameraDisplayName(camCode, camerasRef.current);
      const newEvt: CommandEventItem = {
        id: String(payload.id || payload.eventId || `evt-${Date.now()}`),
        eventId: payload.eventId as string,
        eventType: String(payload.eventType || "UNUSUAL_ACTIVITY"),
        severity: String(payload.severity || "MEDIUM"),
        detectedAt: (payload.detectedAt as string) || new Date().toISOString(),
        status: String(payload.status || "OPEN"),
        source: String(payload.source || "DETECTION"),
        cameraId: camCode,
        cameraName: camName,
        riskScore: payload.riskScore != null ? Number(payload.riskScore) : undefined,
        riskLevel: payload.riskLevel as string,
      };
      setRecentEvents((prev) => deduplicateEvents(prev, [newEvt], 20));
    },
    onEventUpdated: (payload) => {
      const tid = String(payload.id || payload.eventId || "");
      setRecentEvents((prev) =>
        prev.map((e) =>
          e.id === tid || e.eventId === tid ? { ...e, status: String(payload.status ?? e.status) } : e
        )
      );
    },
    onAlertCreated: (payload) => {
      const camCode = String(payload.cameraId || "");
      const camName = getCameraDisplayName(camCode, camerasRef.current);
      const newAlert: CommandAlertItem = {
        id: String(payload.id || payload.alertId || `alt-${Date.now()}`),
        alertId: payload.alertId as string,
        title: String(payload.title || "Security Alert Triggered"),
        severity: String(payload.severity || "HIGH"),
        status: String(payload.status || "NEW"),
        cameraId: camCode,
        cameraName: camName,
        createdAt: (payload.createdAt as string) || new Date().toISOString(),
        riskScore: payload.riskScore != null ? Number(payload.riskScore) : undefined,
      };
      setActiveAlerts((prev) => deduplicateEvents(prev, [newAlert], 20));
      if (payload.severity === "CRITICAL" || payload.severity === "HIGH") {
        setCriticalBanner(payload);
        if (payload.severity === "CRITICAL") playCriticalSound();
      }
    },
    onAlertUpdated: (payload) => {
      const tid = String(payload.id || payload.alertId || "");
      setActiveAlerts((prev) =>
        prev.map((a) =>
          a.id === tid || a.alertId === tid ? { ...a, status: String(payload.status ?? a.status) } : a
        )
      );
    },
  });

  // ── Derived metrics ────────────────────────────────────────────────────────
  const onlineCount = useMemo(() => cameras.filter((c) => c.status === "ONLINE").length, [cameras]);

  const activeAlertsCount = useMemo(
    () => calculateActiveAlertsCount(activeAlerts, aiDataMap),
    [activeAlerts, aiDataMap]
  );

  const { score: overallRiskScore, level: overallRiskLevel } = useMemo(
    () => calculateOverallRisk(aiDataMap, cameras, overviewRiskScore),
    [aiDataMap, cameras, overviewRiskScore]
  );

  // Focus a camera card when alert clicked
  const handleCameraFocus = useCallback((cameraIdOrDbId: string) => {
    const cam = cameras.find((c) => c.id === cameraIdOrDbId || c.cameraId === cameraIdOrDbId);
    if (cam) {
      setExpandedId(cam.id);
      document.getElementById(`cam-card-${cam.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [cameras]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <MonitoringPortal portal={portal} user={user}>
      {/* ── Status Banner ──────────────────────────────────────────────────── */}
      <StatusBanner
        onlineCount={onlineCount}
        totalCount={cameras.length}
        activeAlertsCount={activeAlertsCount}
        overallRiskScore={overallRiskScore}
        overallRiskLevel={overallRiskLevel}
        realtimeStatus={realtimeStatus}
        refreshing={refreshing}
        onRefresh={() => load(false)}
        base={base}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        overview={overview}
      />

      {/* ── Dev Test Mode ──────────────────────────────────────────────────── */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4">
          <TestModePanel cameraId={cameras[0]?.id} />
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && cameras.length === 0 ? (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-glass" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-glass" />
            <div className="h-64 animate-pulse rounded-2xl bg-glass" />
          </div>
        </div>
      ) : cameras.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
          <Camera className="mx-auto h-12 w-12 text-muted" />
          <h3 className="mt-3 text-base font-semibold">No Cameras Configured</h3>
          <p className="mt-1 text-xs text-muted">Configure camera feeds in the Campus Management portal to activate live AI surveillance.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* ── Risk Distribution ─────────────────────────────────────────── */}
          <RiskDistributionBar aiDataMap={aiDataMap} />

          {/* ── Camera Grid ───────────────────────────────────────────────── */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-bold uppercase tracking-tight">LIVE CAMERA NETWORK</h2>
                <p className="mt-0.5 text-[10px] text-muted">Streams load on demand — click a card to activate live feed.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {onlineCount} ONLINE
                </span>
                {cameras.length - onlineCount > 0 && (
                  <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {cameras.length - onlineCount} OFFLINE
                  </span>
                )}
                <span className="rounded-full border border-border bg-surface/60 px-2.5 py-0.5 font-mono text-[10px] text-muted">
                  {cameras.length} total
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cameras.map((cam) => (
                <div key={cam.id} id={`cam-card-${cam.id}`}>
                  <CameraCard
                    cam={cam}
                    aiData={aiDataMap[cam.id] || getDefaultAIData(cam.cameraId)}
                    expanded={expandedId === cam.id}
                    onExpand={() => setExpandedId(cam.id)}
                    base={base}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Alerts + Events ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ActiveAlertsPanel alerts={activeAlerts} base={base} onCameraFocus={handleCameraFocus} />
            <EventTimelinePanel events={recentEvents} base={base} />
          </div>
        </div>
      )}

      {/* ── Critical banner overlay ────────────────────────────────────────── */}
      {criticalBanner && (
        <CriticalAlertBanner
          alert={criticalBanner as { id?: string; title?: string; severity?: string; location?: Record<string, string | undefined> }}
          basePath={base}
          onDismiss={() => setCriticalBanner(null)}
        />
      )}
    </MonitoringPortal>
  );
}
