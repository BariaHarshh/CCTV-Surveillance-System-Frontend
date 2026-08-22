"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { RefreshCw, Shield, UserCheck, Users, UserX, Wifi, AlertTriangle, Building2 } from "lucide-react";
import { AdminShell } from "./AdminShell";
import { StatCard, StatCardSkeleton } from "@/components/super-admin/StatCard";
import { DonutChart } from "@/components/super-admin/DonutChart";
import { EmptyState } from "@/components/super-admin/EmptyState";
import { useAdminDashboardData } from "./useAdminDashboardData";
import { formatRelativeTime } from "@/lib/utils/time";
import type { SafeUser } from "@/lib/auth/sanitize-user";

export function AdminDashboard({ user }: { user: SafeUser }) {
  const { data, loading, error, refetch, notifications } = useAdminDashboardData();
  const stats = data?.statistics;

  if (error && !data) {
    return (
      <AdminShell user={user}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-medium text-red-400">Unable to load dashboard</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button type="button" onClick={() => refetch()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      user={user}
      organizationName={data?.organization.name}
      organizationStatus={data?.organization.status}
      notifications={notifications}
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Welcome back, {user.name}</h1>
          <p className="mt-1 text-muted">Here&apos;s what&apos;s happening across your organization.</p>
          {data?.organization.name && (
            <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-accent">
              <Building2 className="h-5 w-5" /> {data.organization.name}
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : stats ? (
            <>
              <StatCard label="Total Staff" value={stats.staff.total} icon={Users} delay={0} />
              <StatCard label="Active Staff" value={stats.staff.active} icon={UserCheck} delay={0.05} />
              <StatCard label="Inactive Staff" value={stats.staff.inactive} icon={UserX} delay={0.1} />
              <StatCard label="Suspended Staff" value={stats.staff.suspended} icon={Shield} delay={0.15} />
              <StatCard label="Online Staff" value={stats.staff.online} icon={Wifi} delay={0.2} />
              <StatCard label="Total Campus Users" value={stats.campusUsers} icon={Users} delay={0.25} />
              <StatCard label="Active Alerts" value={stats.activeAlerts} icon={AlertTriangle} delay={0.3} />
              <StatCard label="Organization Status" value={stats.organizationStatus} icon={Building2} delay={0.35} />
            </>
          ) : null}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
            <h2 className="text-lg font-semibold">Staff Overview</h2>
            <p className="mt-1 text-sm text-muted">Active, inactive, suspended, and online staff</p>
            <div className="mt-6 flex justify-center">
              {loading ? (
                <div className="h-48 w-48 animate-pulse rounded-full bg-white/[0.04]" />
              ) : data?.staffOverview ? (
                <DonutChart title="Staff" data={data.staffOverview.filter((d) => d.value > 0)} />
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Organization Activity</h2>
              <Link href="/admin/security" className="text-xs text-accent hover:underline">View all</Link>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
                ))
              ) : data?.activity.length ? (
                data.activity.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="text-sm">{item.description}</p>
                    <p className="mt-1 text-xs text-muted">{formatRelativeTime(new Date(item.createdAt))}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No recent activity" description="Activity from your organization will appear here." icon="inbox" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AdminShell>
  );
}
