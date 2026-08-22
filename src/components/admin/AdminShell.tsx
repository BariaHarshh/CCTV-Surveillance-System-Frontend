"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopNav } from "./AdminTopNav";
import { AdminProvider } from "./AdminProvider";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  user: SafeUser;
  children: React.ReactNode;
  organizationName?: string;
  organizationStatus?: string;
  notifications?: { id: string; description: string; time: string }[];
}

export function AdminShell({
  user,
  children,
  organizationName,
  organizationStatus,
  notifications,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AdminProvider user={user}>
      <div className="min-h-screen bg-background">
        <AdminSidebar open={sidebarOpen} collapsed={collapsed} onClose={() => setSidebarOpen(false)} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <div className={cn("flex min-h-screen flex-col transition-all", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
          <AdminTopNav
            onMenuClick={() => setSidebarOpen(true)}
            organizationName={organizationName}
            organizationStatus={organizationStatus}
            notifications={notifications}
          />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AdminProvider>
  );
}
