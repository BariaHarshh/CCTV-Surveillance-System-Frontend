"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { SafeUser } from "@/lib/auth/sanitize-user";

export function StaffSuccessClient({ user }: { user: SafeUser }) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ name: string; userId: string; password: string; orgName: string; orgId: string; staffId: string } | null>(null);

  useEffect(() => {
    const key = searchParams.get("key");
    if (key) {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        setData(JSON.parse(raw));
        sessionStorage.removeItem(key);
      }
    }
  }, [searchParams]);

  if (!data) {
    return (
      <AdminShell user={user}>
        <p className="text-muted">Loading success details...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell user={user}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
        <h1 className="mt-4 text-2xl font-bold">Staff Account Created</h1>
        <p className="mt-2 text-muted">{data.name} has been added to {data.orgName}</p>
        <div className="mt-6 space-y-3 rounded-xl border border-white/[0.08] bg-surface/60 p-4 text-left text-sm">
          <div><span className="text-muted">Staff ID</span><p className="font-mono font-medium">{data.userId}</p></div>
          <div><span className="text-muted">Temporary Password</span><p className="font-mono font-medium">{data.password}</p></div>
          <p className="text-xs text-amber-300">Share credentials securely. Staff must change password on first login.</p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/admin/staff/${data.staffId}`} className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background">View Staff</Link>
          <Link href="/admin/staff" className="rounded-full border border-white/[0.08] px-6 py-2.5 text-sm">Back to Staff</Link>
        </div>
      </motion.div>
    </AdminShell>
  );
}
