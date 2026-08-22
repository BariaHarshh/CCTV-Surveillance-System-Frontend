"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Plus, Search } from "lucide-react";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { StatusBadge } from "@/components/super-admin/StatusBadge";
import { EmptyState } from "@/components/super-admin/EmptyState";
import { formatRelativeTime } from "@/lib/utils/time";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { cn } from "@/lib/utils";

const TABS = [
  "Overview",
  "Organization Information",
  "Campus",
  "Purpose & Safety",
  "Administrators",
  "Users",
  "Activity",
  "Settings",
] as const;

type Tab = (typeof TABS)[number];

interface OrgDetail {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  location: string;
  city: string;
  country: string;
  admins: number;
  staff: number;
  cameras: number;
  status: string;
  createdAt: string;
  lastActivity: string;
  basicInformation: Record<string, string>;
  locationDetails: Record<string, string>;
  campus: Record<string, string | number>;
  purpose: { useCases: string[]; description: string; safetyPriorities: string[] };
  primaryContact: Record<string, string>;
}

interface AdminRow {
  id: string;
  name: string;
  userId: string;
  email: string;
  status: string;
  jobTitle: string;
  department: string;
  lastLogin: string | null;
  createdAt: string;
}

export function OrganizationProfileClient({ user, orgId }: { user: SafeUser; orgId: string }) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") === "settings" ? "Settings" : "Overview") as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminQ, setAdminQ] = useState("");

  const fetchOrg = useCallback(async () => {
    const res = await fetch(`/api/super-admin/organizations/${orgId}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setOrg(data.organization);
    }
  }, [orgId]);

  const fetchAdmins = useCallback(async () => {
    const params = adminQ ? `?q=${encodeURIComponent(adminQ)}` : "";
    const res = await fetch(`/api/super-admin/organizations/${orgId}/admins${params}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setAdmins(data.admins);
    }
  }, [orgId, adminQ]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchOrg(), fetchAdmins()]);
      setLoading(false);
    })();
  }, [fetchOrg, fetchAdmins]);

  if (loading) {
    return (
      <SuperAdminShell user={user}>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </SuperAdminShell>
    );
  }

  if (!org) {
    return (
      <SuperAdminShell user={user}>
        <EmptyState icon="building" title="Organization not found" description="This organization may have been archived." />
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell user={user}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/super-admin/organizations" className="text-sm text-muted hover:text-accent">← Organizations</Link>
          <h1 className="mt-2 text-2xl font-bold">{org.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-mono text-accent">{org.organizationId}</span>
            <span className="text-muted">{org.type}</span>
            <span className="text-muted">{org.location}</span>
            <StatusBadge status={org.status} />
            <span className="text-muted">Created {formatRelativeTime(new Date(org.createdAt))}</span>
          </div>
        </div>
        <Link href={`/super-admin/organizations/${orgId}/admins/new`}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-background">
          <Plus className="h-4 w-4" /> Create Admin
        </Link>
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-px">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn("whitespace-nowrap px-4 py-2.5 text-sm transition-colors",
              tab === t ? "border-b-2 border-accent text-accent" : "text-muted hover:text-white")}>
            {t}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
        {tab === "Overview" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Administrators", org.admins],
              ["Staff", org.staff],
              ["Cameras", org.cameras],
              ["Buildings", org.campus.buildings],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-2xl border border-white/[0.06] bg-surface/60 p-5">
                <p className="text-xs uppercase tracking-wider text-muted">{label as string}</p>
                <p className="mt-2 font-mono text-2xl font-semibold">{value as number}</p>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-2xl border border-white/[0.06] bg-surface/60 p-5">
              <p className="text-xs uppercase tracking-wider text-muted">Primary Contact</p>
              <p className="mt-2 font-medium">{org.primaryContact.name}</p>
              <p className="text-sm text-muted">{org.primaryContact.email}</p>
            </div>
          </div>
        )}

        {tab === "Organization Information" && (
          <InfoGrid items={[
            ["Name", org.basicInformation.name],
            ["Legal Name", org.basicInformation.legalName],
            ["Type", org.type],
            ["Registration", org.basicInformation.registrationNumber],
            ["Website", org.basicInformation.website],
            ["Email", org.basicInformation.email],
            ["Phone", org.basicInformation.phone],
            ["Country", org.locationDetails.country],
            ["State", org.locationDetails.state],
            ["City", org.locationDetails.city],
            ["Address", org.locationDetails.address],
            ["Postal Code", org.locationDetails.postalCode],
          ]} />
        )}

        {tab === "Campus" && (
          <InfoGrid items={Object.entries(org.campus).map(([k, v]) => [
            k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
            String(v),
          ])} />
        )}

        {tab === "Purpose & Safety" && (
          <div className="space-y-6">
            <Section title="Use Cases" items={org.purpose.useCases} />
            <div className="rounded-2xl border border-white/[0.06] p-5">
              <p className="text-xs uppercase tracking-wider text-muted">Primary Use Case</p>
              <p className="mt-2 text-sm">{org.purpose.description || "—"}</p>
            </div>
            <Section title="Safety Priorities" items={org.purpose.safetyPriorities} />
          </div>
        )}

        {tab === "Administrators" && (
          <div>
            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={adminQ} onChange={(e) => setAdminQ(e.target.value)} placeholder="Search admins..."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm" />
            </div>
            {admins.length === 0 ? (
              <EmptyState icon="inbox" title="No administrators yet"
                description="Create the first administrator for this organization."
                actionLabel="Create Admin"
                onAction={() => window.location.assign(`/super-admin/organizations/${orgId}/admins/new`)} />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs uppercase text-muted">
                      <th className="px-4 py-3">Admin Name</th>
                      <th className="px-4 py-3">Admin ID</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Login</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => (
                      <tr key={a.id} className="border-b border-white/[0.04]">
                        <td className="px-4 py-3 font-medium">{a.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{a.userId}</td>
                        <td className="px-4 py-3">{a.jobTitle}</td>
                        <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                        <td className="px-4 py-3 text-muted">{a.lastLogin ? formatRelativeTime(new Date(a.lastLogin)) : "Never"}</td>
                        <td className="px-4 py-3 text-muted">{formatRelativeTime(new Date(a.createdAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(tab === "Users" || tab === "Activity") && (
          <PlaceholderTab title={tab} description={`${tab} management will be available in a future release.`} />
        )}

        {tab === "Settings" && (
          <PlaceholderTab title="Organization Settings"
            description="Edit organization details from the organization wizard in a future update. Use the organizations list actions to suspend or archive." />
        )}
      </motion.div>
    </SuperAdminShell>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-white/[0.06] p-4">
          <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1 text-sm">{value || "—"}</p>
        </div>
      ))}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? items.map((i) => (
          <span key={i} className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs">{i}</span>
        )) : <span className="text-sm text-muted">—</span>}
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}
