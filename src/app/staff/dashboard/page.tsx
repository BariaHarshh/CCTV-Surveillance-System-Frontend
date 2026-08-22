"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatRelativeTime } from "@/lib/utils/time";

function StaffDashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState<{ organization: { name: string; organizationId: string } | null; user: { status: string; lastLogin: string | null; permissions: string[] } } | null>(null);

  useEffect(() => {
    fetch("/api/staff/dashboard", { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
        <p className="mt-2 text-muted">Staff Portal · AI Campus Guardian</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
            <p className="text-sm text-muted">Organization</p>
            <p className="mt-2 text-lg font-semibold text-accent">{data?.organization?.name ?? "—"}</p>
            <p className="font-mono text-xs text-muted">{data?.organization?.organizationId}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
            <p className="text-sm text-muted">Role</p>
            <p className="mt-2 text-lg font-semibold">STAFF</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
            <p className="text-sm text-muted">Account Status</p>
            <p className="mt-2 text-lg font-semibold">{data?.user?.status ?? user?.status}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
            <p className="text-sm text-muted">Last Login</p>
            <p className="mt-2 text-lg font-semibold">{data?.user?.lastLogin ? formatRelativeTime(new Date(data.user.lastLogin)) : "—"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-surface/50 p-6">
          <p className="text-sm text-muted">Assigned Permissions</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(data?.user?.permissions ?? []).map((p) => (
              <li key={p} className="rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs text-accent">{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["STAFF"]}>
      <StaffDashboardContent />
    </ProtectedRoute>
  );
}
