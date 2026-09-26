"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  AlertTriangle,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
  Package,
  Clock,
  AlertOctagon,
  Eye,
  UserCheck,
  Zap,
} from "lucide-react";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { MonitoringPortal } from "./MonitoringPortal";
import { CameraStreamView } from "./CameraStreamView";
import {
  CameraStatusDot,
  RealtimeIndicator,
  SeverityBadge,
  formatEventType,
  formatTime,
} from "./shared";
import { useMonitoringSocket } from "@/hooks/useMonitoringSocket";
import { cn } from "@/lib/utils";
import {
  type CameraAIData,
  type CameraCrowdDetails,
  type CameraBehaviorDetails,
  type CameraRestrictedAreaDetails,
  type CameraAbandonedObjectDetails,
  getDefaultAIData,
  parseAIDataFromPayload,
} from "@/lib/monitoring/ai-metadata-parser";
import {
  type CommandCameraItem,
  type CommandAlertItem,
  type CommandEventItem,
  getAIFeatureLabel,
  getCameraDisplayName,
  calculateOverallRisk,
  calculateActiveAlertsCount,
  deduplicateEvents,
} from "@/lib/monitoring/command-center-utils";

/* =========================================================================
   1. Global Security Command Header
   ========================================================================= */

interface GlobalSecurityHeaderProps {
  onlineCount: number;
  totalCount: number;
  activeAlertsCount: number;
  overallRiskScore: number;
  overallRiskLevel: string;
  realtimeStatus: "connected" | "disconnected" | "reconnecting";
  refreshing?: boolean;
  onRefresh: () => void;
  portalBase: string;
}

const GlobalSecurityHeader = React.memo(function GlobalSecurityHeader({
  onlineCount,
  totalCount,
  activeAlertsCount,
  overallRiskScore,
  overallRiskLevel,
  realtimeStatus,
  refreshing = false,
  onRefresh,
  portalBase,
}: GlobalSecurityHeaderProps) {
  const isCritical = overallRiskLevel === "CRITICAL" || activeAlertsCount > 0;
  const isHigh = overallRiskLevel === "HIGH";

  const riskBadgeClass =
    overallRiskLevel === "CRITICAL"
      ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
      : overallRiskLevel === "HIGH"
      ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
      : overallRiskLevel === "MEDIUM"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  return (
    <div className="flex flex-col gap-4">
      {/* Top Title & Navigation Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`${portalBase}/monitoring`}
              className="text-xs font-medium text-muted transition-colors hover:text-accent"
            >
              ← Monitoring Overview
            </Link>
            <span className="text-muted/40">/</span>
            <span className="text-xs text-muted">AI Security Command Center</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight lg:text-3xl">
            AI Security Command Center
          </h1>
          <p className="mt-1 text-xs text-muted">
            Real-time multi-camera AI analytics, live threat detection HUDs & automated campus surveillance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border bg-glass px-3 py-1.5 shadow-sm">
            <RealtimeIndicator status={realtimeStatus} />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted shadow-sm transition-all hover:bg-glass hover:text-foreground disabled:opacity-70"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-accent")} />
            {refreshing ? "Refreshing..." : "Refresh Center"}
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: Cameras Online */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-accent" /> Cameras Online
            </span>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                onlineCount === totalCount && totalCount > 0
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                  : onlineCount > 0
                  ? "bg-amber-400"
                  : "bg-red-500"
              )}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-foreground">
              {onlineCount} <span className="text-sm font-normal text-muted">/ {totalCount}</span>
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                onlineCount === totalCount && totalCount > 0
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-amber-500/15 text-amber-400"
              )}
            >
              {onlineCount === totalCount && totalCount > 0 ? "100% ONLINE" : "PARTIAL"}
            </span>
          </div>
        </div>

        {/* Metric 2: Active Alerts */}
        <div
          className={cn(
            "flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition-colors",
            activeAlertsCount > 0
              ? "border-red-500/40 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
              : "border-border bg-surface/60"
          )}
        >
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5">
              {activeAlertsCount > 0 ? (
                <ShieldAlert className="h-3.5 w-3.5 animate-pulse text-red-400" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              )}
              Active Alerts
            </span>
            {activeAlertsCount > 0 && (
              <span className="h-2 w-2 animate-ping rounded-full bg-red-400" />
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-2xl font-black",
                activeAlertsCount > 0 ? "text-red-400" : "text-foreground"
              )}
            >
              {activeAlertsCount}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                activeAlertsCount > 0
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : "bg-emerald-500/15 text-emerald-400"
              )}
            >
              {activeAlertsCount > 0 ? "ACTION REQUIRED" : "ALL CLEAR"}
            </span>
          </div>
        </div>

        {/* Metric 3: Overall Campus Risk */}
        <div
          className={cn(
            "flex flex-col justify-between rounded-xl border p-3.5 shadow-sm transition-colors",
            isCritical
              ? "border-red-500/40 bg-red-500/10"
              : isHigh
              ? "border-orange-500/40 bg-orange-500/10"
              : "border-border bg-surface/60"
          )}
        >
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> Campus Threat Risk
            </span>
            <span
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                riskBadgeClass
              )}
            >
              {overallRiskLevel}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-2xl font-black text-foreground">
              {overallRiskScore}{" "}
              <span className="text-sm font-normal text-muted">/ 100</span>
            </span>
            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-800 sm:w-20">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  overallRiskScore >= 75
                    ? "bg-red-500"
                    : overallRiskScore >= 50
                    ? "bg-orange-500"
                    : overallRiskScore >= 25
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                )}
                style={{ width: `${Math.max(5, overallRiskScore)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 4: AI Engine Pipeline Status */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface/60 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-400" /> AI Inference Engine
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-sm font-bold text-foreground">
              YOLOv8 + ByteTrack
            </span>
            <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-accent">
              4 PIPELINES
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   2. Camera-Specific AI Analytics HUDs
   ========================================================================= */

const CrowdOccupancyHUD = React.memo(function CrowdOccupancyHUD({
  crowd,
}: {
  crowd: CameraCrowdDetails;
}) {
  const capacityPct = Math.min(
    100,
    Math.round((crowd.currentCount / (crowd.capacity || 1)) * 100)
  );

  return (
    <div className="mt-3 rounded-xl border border-border bg-glass p-3.5">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Users className="h-3 w-3" /> YOLOv8 Count
          </span>
          <span className="mt-0.5 block font-mono text-xl font-extrabold text-foreground">
            {crowd.currentCount}
          </span>
        </div>
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Activity className="h-3 w-3" /> ByteTrack Stable
          </span>
          <span className="mt-0.5 block font-mono text-xl font-extrabold text-accent">
            {crowd.stableCount}
          </span>
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted">
          <span>Occupancy Capacity</span>
          <span className="font-mono text-foreground">
            {crowd.currentCount} / {crowd.capacity} ({capacityPct}%)
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              capacityPct >= 100
                ? "bg-red-500"
                : capacityPct >= 70
                ? "bg-amber-500"
                : "bg-emerald-500"
            )}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>
    </div>
  );
});

const BehaviorDetectionHUD = React.memo(function BehaviorDetectionHUD({
  behavior,
}: {
  behavior: CameraBehaviorDetails;
}) {
  const hasAlert = behavior.hasFall || behavior.hasFight || behavior.behaviorState === "SUSPICIOUS";

  return (
    <div className="mt-3 rounded-xl border border-border bg-glass p-3.5">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Users className="h-3 w-3" /> Tracked People
          </span>
          <span className="mt-0.5 block font-mono text-xl font-extrabold text-foreground">
            {behavior.personCount}
          </span>
        </div>
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Activity className="h-3 w-3" /> Behaviour State
          </span>
          <span
            className={cn(
              "mt-0.5 block font-mono text-xs font-bold uppercase tracking-tight",
              behavior.hasFall || behavior.hasFight
                ? "text-red-400"
                : behavior.behaviorState === "SUSPICIOUS"
                ? "text-amber-400"
                : "text-emerald-400"
            )}
          >
            {behavior.hasFall
              ? "FALL DETECTED"
              : behavior.hasFight
              ? "FIGHT DETECTED"
              : behavior.behaviorState || "NORMAL"}
          </span>
        </div>
      </div>

      {/* Behavior State Alert Status Bar */}
      <div className="mt-3">
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
            behavior.hasFall
              ? "border border-red-500/40 bg-red-500/15 text-red-300"
              : behavior.hasFight
              ? "border border-red-500/40 bg-red-500/15 text-red-300"
              : behavior.behaviorState === "SUSPICIOUS"
              ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          )}
        >
          <span className="flex items-center gap-1.5">
            {hasAlert ? (
              <AlertOctagon className="h-3.5 w-3.5 animate-pulse text-red-400" />
            ) : (
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
            )}
            {behavior.hasFall
              ? "Fall Anomaly Detected"
              : behavior.hasFight
              ? "Violent Movement Detected"
              : behavior.behaviorState === "SUSPICIOUS"
              ? "Suspicious Posture Observed"
              : "Movement & Posture Normal"}
          </span>
          <span className="font-mono text-[10px] uppercase opacity-80">
            {hasAlert ? "Alert Active" : "Nominal"}
          </span>
        </div>
      </div>
    </div>
  );
});

const RestrictedAreaHUD = React.memo(function RestrictedAreaHUD({
  restrictedArea,
}: {
  restrictedArea: CameraRestrictedAreaDetails;
}) {
  const isAlert = restrictedArea.hasBreach || restrictedArea.zoneStatus === "ALERT";
  const isChecking = restrictedArea.zoneStatus === "CHECKING";

  return (
    <div className="mt-3 rounded-xl border border-border bg-glass p-3.5">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Shield className="h-3 w-3" /> Perimeter Status
          </span>
          <span
            className={cn(
              "mt-0.5 block font-mono text-sm font-extrabold uppercase",
              isAlert ? "text-red-400" : isChecking ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {isAlert ? "BREACH ALERT" : isChecking ? "CHECKING" : "SECURE"}
          </span>
        </div>
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Eye className="h-3 w-3" /> Active Intruders
          </span>
          <span
            className={cn(
              "mt-0.5 block font-mono text-xl font-extrabold",
              restrictedArea.activeIntrudersCount > 0 ? "text-red-400" : "text-foreground"
            )}
          >
            {restrictedArea.activeIntrudersCount}
          </span>
        </div>
      </div>

      {/* Zone Breach Banner */}
      <div className="mt-3">
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
            isAlert
              ? "border border-red-500/50 bg-red-500/20 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
              : isChecking
              ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          )}
        >
          <span className="flex items-center gap-1.5">
            {isAlert ? (
              <ShieldAlert className="h-3.5 w-3.5 animate-pulse text-red-400" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            )}
            {isAlert
              ? `Unauthorized Entry (${restrictedArea.activeIntrudersCount} Intruder)`
              : isChecking
              ? "Perimeter Verification Active"
              : "Perimeter Polygon Protected"}
          </span>
          <span className="font-mono text-[10px] opacity-80">
            {isAlert ? "CRITICAL" : "SECURE"}
          </span>
        </div>
      </div>
    </div>
  );
});

const AbandonedObjectHUD = React.memo(function AbandonedObjectHUD({
  abandonedObject,
}: {
  abandonedObject: CameraAbandonedObjectDetails;
}) {
  const isAbandoned =
    abandonedObject.objectStatus === "ABANDONED" || abandonedObject.abandonedCount > 0;
  const isUnattended =
    abandonedObject.objectStatus === "UNATTENDED" ||
    abandonedObject.unattendedCount > 0 ||
    abandonedObject.unattendedDuration > 0;

  const timerSec = abandonedObject.unattendedDuration ?? 0;
  const timerPct = Math.min(100, Math.round((timerSec / 15) * 100));

  return (
    <div className="mt-3 rounded-xl border border-border bg-glass p-3.5">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Package className="h-3 w-3" /> Tracked Luggage
          </span>
          <span className="mt-0.5 block font-mono text-xl font-extrabold text-foreground">
            {abandonedObject.totalObjects}
          </span>
        </div>
        <div>
          <span className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase text-muted">
            <Clock className="h-3 w-3" /> Unattended Timer
          </span>
          <span
            className={cn(
              "mt-0.5 block font-mono text-xl font-extrabold",
              isAbandoned ? "text-red-400" : isUnattended ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {timerSec > 0 ? `${timerSec.toFixed(1)}s` : "0.0s"}
          </span>
        </div>
      </div>

      {/* Unattended Timer Bar & Status */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] font-medium text-muted">
          <span>
            {isAbandoned
              ? "Escalated to Abandoned"
              : isUnattended
              ? "Luggage Unattended"
              : "Luggage Attended"}
          </span>
          <span className="font-mono text-foreground">
            {isAbandoned ? "ALERT" : `${timerSec.toFixed(1)}s / 15.0s`}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAbandoned
                ? "bg-red-500"
                : timerPct >= 60
                ? "bg-amber-500"
                : "bg-emerald-500"
            )}
            style={{ width: `${isAbandoned ? 100 : timerPct}%` }}
          />
        </div>
      </div>
    </div>
  );
});

/* =========================================================================
   3. Monitoring Camera Card Component (Enhanced Header & Priority Border)
   ========================================================================= */

const MonitoringCameraCard = React.memo(function MonitoringCameraCard({
  camera,
  aiData,
}: {
  camera: CommandCameraItem;
  aiData: CameraAIData;
}) {
  const isCam1 =
    aiData.moduleType === "OCCUPANCY_DETECTION" ||
    camera.cameraId.includes("1") ||
    camera.name.toLowerCase().includes("entrance");
  const isCam2 =
    aiData.moduleType === "PERSON_DETECTION" ||
    camera.cameraId.includes("2") ||
    camera.name.toLowerCase().includes("corridor");
  const isCam3 =
    aiData.moduleType === "RESTRICTED_ZONE" ||
    camera.cameraId.includes("3") ||
    camera.name.toLowerCase().includes("server");
  const isCam4 =
    aiData.moduleType === "ABANDONED_OBJECT" ||
    camera.cameraId.includes("4") ||
    camera.name.toLowerCase().includes("library");

  // Determine top feature status badge & visual priority
  let statusBadgeText = "NORMAL";
  let statusBadgeClass = "bg-emerald-500/20 text-emerald-400";
  let hasCriticalAlert = false;
  let hasHighAlert = false;

  if (isCam1 && aiData.crowd) {
    statusBadgeText = aiData.crowd.crowdState;
    if (aiData.crowd.crowdState === "CROWD DETECTED") {
      statusBadgeClass = "bg-red-500/20 text-red-400 animate-pulse";
      hasCriticalAlert = true;
    } else if (aiData.crowd.crowdState === "CHECKING CROWD") {
      statusBadgeClass = "bg-amber-500/20 text-amber-400";
      hasHighAlert = true;
    } else {
      statusBadgeClass = "bg-emerald-500/20 text-emerald-400";
    }
  } else if (isCam2 && aiData.behavior) {
    if (aiData.behavior.hasFall) {
      statusBadgeText = "FALL DETECTED";
      statusBadgeClass = "bg-red-500/20 text-red-400 animate-pulse";
      hasCriticalAlert = true;
    } else if (aiData.behavior.hasFight) {
      statusBadgeText = "FIGHT DETECTED";
      statusBadgeClass = "bg-red-500/20 text-red-400 animate-pulse";
      hasCriticalAlert = true;
    } else if (aiData.behavior.behaviorState === "SUSPICIOUS") {
      statusBadgeText = "SUSPICIOUS";
      statusBadgeClass = "bg-amber-500/20 text-amber-400";
      hasHighAlert = true;
    } else {
      statusBadgeText = "NORMAL";
      statusBadgeClass = "bg-emerald-500/20 text-emerald-400";
    }
  } else if (isCam3 && aiData.restrictedArea) {
    if (aiData.restrictedArea.hasBreach || aiData.restrictedArea.zoneStatus === "ALERT") {
      statusBadgeText = "BREACH ALERT";
      statusBadgeClass = "bg-red-500/20 text-red-400 animate-pulse";
      hasCriticalAlert = true;
    } else if (aiData.restrictedArea.zoneStatus === "CHECKING") {
      statusBadgeText = "CHECKING";
      statusBadgeClass = "bg-amber-500/20 text-amber-400";
      hasHighAlert = true;
    } else {
      statusBadgeText = "SECURE";
      statusBadgeClass = "bg-emerald-500/20 text-emerald-400";
    }
  } else if (isCam4 && aiData.abandonedObject) {
    if (aiData.abandonedObject.objectStatus === "ABANDONED") {
      statusBadgeText = "ABANDONED";
      statusBadgeClass = "bg-red-500/20 text-red-400 animate-pulse";
      hasCriticalAlert = true;
    } else if (aiData.abandonedObject.objectStatus === "UNATTENDED") {
      statusBadgeText = "UNATTENDED";
      statusBadgeClass = "bg-amber-500/20 text-amber-400";
      hasHighAlert = true;
    } else {
      statusBadgeText = "CLEAR";
      statusBadgeClass = "bg-emerald-500/20 text-emerald-400";
    }
  }

  // Risk Score Styling
  const isRiskCritical = aiData.riskLevel === "CRITICAL" || aiData.riskScore >= 75;
  const isRiskHigh = aiData.riskLevel === "HIGH" || aiData.riskScore >= 50;
  const isRiskMedium = aiData.riskLevel === "MEDIUM" || aiData.riskScore >= 25;

  const riskClass = isRiskCritical
    ? "bg-red-500/20 text-red-400 border border-red-500/40"
    : isRiskHigh
    ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
    : isRiskMedium
    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";

  const isCardThreatAlert = hasCriticalAlert || isRiskCritical;
  const isCardWarning = hasHighAlert || isRiskHigh;

  const aiFeatureTitle = getAIFeatureLabel(camera.cameraId, aiData.moduleType);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-surface/60 p-4 transition-all duration-300",
        isCardThreatAlert
          ? "border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.25)] ring-1 ring-red-500/40"
          : isCardWarning
          ? "border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30"
          : "border-border hover:border-accent/30"
      )}
    >
      {/* Enhanced Camera Header with AI Feature Badge */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {camera.status === "ONLINE" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                camera.status === "ONLINE" ? "bg-emerald-500" : "bg-slate-500"
              )}
            />
          </span>
          <span className="text-xs font-bold text-foreground">{camera.name}</span>
          <span className="rounded bg-glass px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted">
            {camera.cameraId}
          </span>
          <span className="hidden rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-medium text-accent sm:inline-block">
            {aiFeatureTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CameraStatusDot status={camera.status} />

          {/* Real-time Risk Score Badge */}
          <span
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
              riskClass
            )}
          >
            <span>RISK {aiData.riskScore}</span>
            <span className="opacity-70">[{aiData.riskLevel}]</span>
          </span>

          {/* Feature Status Badge */}
          <span
            className={cn(
              "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
              statusBadgeClass
            )}
          >
            {statusBadgeText}
          </span>
        </div>
      </div>

      {/* Independent Direct Video Stream Container with Rich AI Overlay */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <CameraStreamView
          cameraDbId={camera.id}
          status={camera.status}
          className="w-full"
          detections={aiData.detections}
          zones={aiData.zones}
        />
      </div>

      {/* Location & Time Footer */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
        <span className="truncate">
          {[camera.location?.building, camera.location?.room, camera.location?.areaLabel]
            .filter(Boolean)
            .join(" · ") || "Main Campus Area"}
        </span>
        <span className="font-mono">{aiData.lastUpdate ? formatTime(aiData.lastUpdate) : "Live"}</span>
      </div>

      {/* Camera-Specific AI Analytics HUD */}
      {isCam2 && aiData.behavior ? (
        <BehaviorDetectionHUD behavior={aiData.behavior} />
      ) : isCam3 && aiData.restrictedArea ? (
        <RestrictedAreaHUD restrictedArea={aiData.restrictedArea} />
      ) : isCam4 && aiData.abandonedObject ? (
        <AbandonedObjectHUD abandonedObject={aiData.abandonedObject} />
      ) : (
        <CrowdOccupancyHUD
          crowd={
            aiData.crowd || {
              rawCount: 0,
              stableCount: 0,
              currentCount: 0,
              threshold: 10,
              capacity: 10,
              crowdState: "NORMAL",
              crowdDetected: false,
            }
          }
        />
      )}
    </div>
  );
});

/* =========================================================================
   4. Active Alerts Panel Component
   ========================================================================= */

interface ActiveAlertsPanelProps {
  alerts: CommandAlertItem[];
  portalBase: string;
}

const ActiveAlertsPanel = React.memo(function ActiveAlertsPanel({
  alerts,
  portalBase,
}: ActiveAlertsPanelProps) {
  const activeList = useMemo(() => {
    return alerts.filter((a) => a.status !== "RESOLVED" && a.status !== "DISMISSED");
  }, [alerts]);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface/50 p-4 shadow-sm">
      {/* Panel Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert
            className={cn(
              "h-4 w-4",
              activeList.length > 0 ? "text-red-400 animate-pulse" : "text-emerald-400"
            )}
          />
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Active Security Alerts
          </h2>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
            activeList.length > 0
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          )}
        >
          {activeList.length} Active
        </span>
      </div>

      {/* Panel Body */}
      {activeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 py-10 text-center">
          <ShieldCheck className="h-9 w-9 text-emerald-400" />
          <h3 className="mt-2 text-sm font-semibold text-emerald-300">
            ALL CLEAR — No Active Security Events
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted">
            All 4 camera perimeter pipelines are operating within nominal thresholds. No security
            breaches detected.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeList.map((alert) => (
            <Link
              key={alert.id}
              href={`${portalBase}/alerts/${alert.id}`}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-3 transition-all hover:bg-glass sm:flex-row sm:items-center sm:justify-between",
                alert.severity === "CRITICAL"
                  ? "border-red-500/40 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                  : alert.severity === "HIGH"
                  ? "border-orange-500/40 bg-orange-500/10"
                  : "border-border bg-glass"
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {alert.cameraName || alert.cameraId || "Campus Camera"}
                  </span>
                  <SeverityBadge severity={alert.severity} />
                  <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted">
                    {alert.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground/90">{alert.title}</p>
              </div>

              <div className="flex items-center justify-between gap-3 text-right sm:flex-col sm:items-end">
                <span className="font-mono text-[11px] text-muted">
                  {formatTime(alert.createdAt)}
                </span>
                {alert.riskScore != null && (
                  <span className="font-mono text-[10px] font-bold text-accent">
                    Risk {alert.riskScore}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});

/* =========================================================================
   5. Event Timeline Component
   ========================================================================= */

interface EventTimelineProps {
  events: CommandEventItem[];
  portalBase: string;
}

const EventTimelinePanel = React.memo(function EventTimelinePanel({
  events,
  portalBase,
}: EventTimelineProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface/50 p-4 shadow-sm">
      {/* Panel Header */}
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold tracking-tight text-foreground">
            Recent Event Timeline
          </h2>
        </div>
        <span className="rounded-full bg-glass px-2 py-0.5 font-mono text-[10px] font-medium text-muted">
          Real-Time Feed
        </span>
      </div>

      {/* Timeline List */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 py-10 text-center">
          <Clock className="h-9 w-9 text-muted" />
          <p className="mt-2 text-xs font-medium text-muted">No recent events recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 15).map((e) => (
            <Link
              key={e.id}
              href={`${portalBase}/events/${e.id}`}
              className="flex items-center justify-between rounded-xl border border-border/80 bg-glass/60 px-3.5 py-2.5 transition-all hover:border-accent/40 hover:bg-glass"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    e.severity === "CRITICAL"
                      ? "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
                      : e.severity === "HIGH"
                      ? "bg-orange-400"
                      : e.severity === "MEDIUM"
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  )}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {formatEventType(e.eventType)}
                    </span>
                    <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted">
                      {e.cameraName || e.cameraId || "Camera"}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted">
                    {formatTime(e.detectedAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <SeverityBadge severity={e.severity} />
                {e.riskScore != null && (
                  <span className="font-mono text-[10px] font-bold text-accent">
                    {e.riskScore}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
});

/* =========================================================================
   6. Main AI Security Command Center Client
   ========================================================================= */

export function LiveAIMonitoringClient({
  user,
  portal,
}: {
  user: SafeUser;
  portal: "admin" | "staff";
  initialCameraId?: string;
}) {
  const portalBase = portal === "admin" ? "/admin" : "/staff";
  const [cameras, setCameras] = useState<CommandCameraItem[]>([]);
  const [aiDataMap, setAiDataMap] = useState<Record<string, CameraAIData>>({});
  const [activeAlerts, setActiveAlerts] = useState<CommandAlertItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<CommandEventItem[]>([]);
  const [overviewRiskScore, setOverviewRiskScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const camerasRef = useRef<CommandCameraItem[]>([]);
  camerasRef.current = cameras;
  const aiDataMapRef = useRef<Record<string, CameraAIData>>({});
  aiDataMapRef.current = aiDataMap;

  // Load all cameras, alerts, events & overview stats in parallel
  const loadCommandCenterData = useCallback(async (showSpinner = false) => {
    if (showSpinner && camerasRef.current.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const [camerasRes, alertsRes, eventsRes, overviewRes] = await Promise.all([
        fetch("/api/monitoring/cameras", { credentials: "include" }),
        fetch("/api/alerts?limit=20", { credentials: "include" }),
        fetch("/api/events?limit=20", { credentials: "include" }),
        fetch("/api/monitoring/overview", { credentials: "include" }),
      ]);

      const [camerasData, alertsData, eventsData, overviewData] = await Promise.all([
        camerasRes.json(),
        alertsRes.json(),
        eventsRes.json(),
        overviewRes.json(),
      ]);

      if (camerasRes.ok && Array.isArray(camerasData.cameras)) {
        const loadedCameras: CommandCameraItem[] = camerasData.cameras;
        setCameras(loadedCameras);

        // Fetch per-camera telemetry & events in parallel
        const detailsMap: Record<string, CameraAIData> = {};
        await Promise.all(
          loadedCameras.map(async (cam) => {
            try {
              const currentAi = aiDataMapRef.current[cam.id] || aiDataMapRef.current[cam.cameraId];
              const defaultData = currentAi || getDefaultAIData(cam.cameraId);
              detailsMap[cam.id] = defaultData;
              detailsMap[cam.cameraId] = defaultData;

              const res = await fetch(`/api/monitoring/cameras/${cam.id}`, {
                credentials: "include",
              });
              const data = await res.json();
              if (res.ok && data.recentEvents && data.recentEvents.length > 0) {
                const latestEvent = data.recentEvents[0];
                const meta = (latestEvent.metadata as Record<string, unknown>) || {};
                // Only use DB metadata if no live Socket.IO detections have arrived
                if (!currentAi || (!currentAi.lastUpdate && currentAi.detections.length === 0)) {
                  const parsed = parseAIDataFromPayload(
                    cam.cameraId,
                    meta.moduleType as string,
                    meta,
                    defaultData
                  );
                  detailsMap[cam.id] = parsed;
                  detailsMap[cam.cameraId] = parsed;
                }
              }
            } catch {
              // Maintain defaults on single camera failure
            }
          })
        );
        setAiDataMap((prev) => {
          const merged = { ...detailsMap };
          for (const [key, val] of Object.entries(prev)) {
            if (val.lastUpdate || val.detections.length > 0) {
              merged[key] = val;
            }
          }
          return merged;
        });
      } else {
        setError(camerasData.error || "Failed to load camera feeds");
      }

      if (alertsRes.ok && Array.isArray(alertsData.alerts)) {
        setActiveAlerts(alertsData.alerts);
      }

      if (eventsRes.ok && Array.isArray(eventsData.events)) {
        setRecentEvents(eventsData.events);
      }

      if (overviewRes.ok && overviewData.overview?.currentRisk?.score != null) {
        setOverviewRiskScore(Number(overviewData.overview.currentRisk.score));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error connecting to Security Command Center APIs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCommandCenterData(true);
  }, [loadCommandCenterData]);

  // Real-time Socket.IO event handler
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
      const meta = (payload.metadata as Record<string, any>) || {};

      setAiDataMap((prevMap) => {
        const matchingCam = camerasRef.current.find(
          (c) =>
            c.id === payloadCamId ||
            c.cameraId === payloadCamId ||
            meta.cameraId === c.cameraId ||
            meta.cameraId === c.id
        );
        const camKey = matchingCam ? matchingCam.id : payloadCamId;
        const camCode = matchingCam ? matchingCam.cameraId : payloadCamId;
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

      const newEvent: CommandEventItem = {
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

      setRecentEvents((prev) => deduplicateEvents(prev, [newEvent], 20));
    },
    onEventUpdated: (payload) => {
      const targetId = String(payload.id || payload.eventId || "");
      setRecentEvents((prev) =>
        prev.map((e) =>
          e.id === targetId || e.eventId === targetId
            ? { ...e, status: String(payload.status ?? e.status) }
            : e
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
    },
    onAlertUpdated: (payload) => {
      const targetId = String(payload.id || payload.alertId || "");
      setActiveAlerts((prev) =>
        prev.map((a) =>
          a.id === targetId || a.alertId === targetId
            ? { ...a, status: String(payload.status ?? a.status) }
            : a
        )
      );
    },
  });

  // Calculate high-level aggregated metrics
  const onlineCount = useMemo(() => {
    return cameras.filter((c) => c.status === "ONLINE").length;
  }, [cameras]);

  const activeAlertsCount = useMemo(() => {
    return calculateActiveAlertsCount(activeAlerts, aiDataMap);
  }, [activeAlerts, aiDataMap]);

  const { score: overallRiskScore, level: overallRiskLevel } = useMemo(() => {
    return calculateOverallRisk(aiDataMap, cameras, overviewRiskScore);
  }, [aiDataMap, cameras, overviewRiskScore]);

  return (
    <MonitoringPortal portal={portal} user={user}>
      {/* 1. Global Security Command Header */}
      <GlobalSecurityHeader
        onlineCount={onlineCount}
        totalCount={cameras.length}
        activeAlertsCount={activeAlertsCount}
        overallRiskScore={overallRiskScore}
        overallRiskLevel={overallRiskLevel}
        realtimeStatus={realtimeStatus}
        refreshing={refreshing}
        onRefresh={() => loadCommandCenterData(false)}
        portalBase={portalBase}
      />

      {/* Main Content Area */}
      {loading && cameras.length === 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
          <div className="h-96 animate-pulse rounded-2xl bg-glass" />
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
          <h3 className="mt-2 font-semibold text-red-300">Command Center Offline</h3>
          <p className="mt-1 text-xs text-muted">{error}</p>
        </div>
      ) : cameras.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/30 p-12 text-center">
          <Camera className="mx-auto h-12 w-12 text-muted" />
          <h3 className="mt-3 text-base font-semibold">No Monitoring Cameras Configured</h3>
          <p className="mt-1 text-xs text-muted">
            Configure camera feeds in the administrative portal to activate live AI surveillance.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* 2. 2x2 Camera Video Wall Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {cameras.map((camera) => (
              <MonitoringCameraCard
                key={camera.id}
                camera={camera}
                aiData={aiDataMap[camera.id] || getDefaultAIData(camera.cameraId)}
              />
            ))}
          </div>

          {/* 3. Active Alerts Panel + Event Timeline (2-Column Grid on Desktop, Stacked on Mobile) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ActiveAlertsPanel alerts={activeAlerts} portalBase={portalBase} />
            <EventTimelinePanel events={recentEvents} portalBase={portalBase} />
          </div>
        </div>
      )}
    </MonitoringPortal>
  );
}
