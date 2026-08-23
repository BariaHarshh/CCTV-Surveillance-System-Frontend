"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { AdminShell } from "@/components/admin/AdminShell";
import { StaffShell } from "@/components/staff/StaffShell";
import { SeverityBadge } from "@/components/monitoring/shared";

export function IncidentDetailClient({ user, incidentId, portal = "admin" }: { user: SafeUser; incidentId: string; portal?: "admin" | "staff" }) {
  const base = portal === "admin" ? "/admin" : "/staff";
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/admin/incidents/${incidentId}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [incidentId]);

  const incident = data?.incident as Record<string, unknown> | undefined;
  const events = (data?.events as Record<string, unknown>[]) ?? [];
  const alerts = (data?.alerts as Record<string, unknown>[]) ?? [];

  async function updateStatus(status: string) {
    await fetch(`/api/admin/incidents/${incidentId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const Shell = portal === "admin" ? AdminShell : StaffShell;

  return (
    <Shell user={user}>
      <Link href={`${base}/incidents`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> Back to incidents
      </Link>

      {loading ? (
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
      ) : !incident ? (
        <p className="mt-8 text-red-400">Incident not found.</p>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="font-mono text-xs text-muted">{String(incident.incidentId)}</p>
              <h1 className="text-2xl font-bold">{String(incident.title)}</h1>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] p-4">
                <p className="text-xs text-muted">Severity</p>
                <div className="mt-2"><SeverityBadge severity={String(incident.severity)} /></div>
              </div>
              <div className="rounded-xl border border-white/[0.08] p-4">
                <p className="text-xs text-muted">Risk Score</p>
                <p className="mt-2 text-2xl font-bold">{String(incident.riskScore)} / 100</p>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Timeline</h2>
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={String(e.id)} className="rounded-xl border border-white/[0.06] px-4 py-3">
                    <p className="text-xs text-muted">{new Date(String(e.detectedAt)).toLocaleString()}</p>
                    <p className="text-sm font-medium">{String(e.eventType).replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </div>

            {alerts.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Related Alerts</h2>
                {alerts.map((a) => (
                  <Link key={String(a.id)} href={`${base}/alerts/${a.id}`} className="block rounded-xl border border-white/[0.06] px-4 py-3 hover:bg-white/[0.02]">
                    <p className="text-sm">{String(a.title)}</p>
                    <p className="text-xs text-muted">{String(a.status)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
            <p className="text-xs text-muted">Status: {String(incident.status)}</p>
            <p className="mt-2 text-xs text-muted">Location: {String((incident.location as Record<string, string>)?.label ?? "—")}</p>
            {incident.assignedToName ? <p className="mt-2 text-xs">Assigned: {String(incident.assignedToName)}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {incident.status === "OPEN" && (
                <button type="button" onClick={() => updateStatus("INVESTIGATING")} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400">Investigate</button>
              )}
              {!["RESOLVED", "DISMISSED"].includes(String(incident.status)) && (
                <>
                  <button type="button" onClick={() => updateStatus("RESOLVED")} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">Resolve</button>
                  <button type="button" onClick={() => updateStatus("DISMISSED")} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-muted">Dismiss</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
