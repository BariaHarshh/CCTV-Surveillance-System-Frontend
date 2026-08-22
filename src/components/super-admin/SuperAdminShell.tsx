"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { SuperAdminProvider } from "./SuperAdminProvider";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { cn } from "@/lib/utils";

interface SuperAdminShellProps {
  user: SafeUser;
  children: React.ReactNode;
  systemStatus?: "operational" | "degraded";
  notifications?: { id: string; description: string; time: string }[];
  onStatusClick?: () => void;
}

export function SuperAdminShell({
  user,
  children,
  systemStatus = "operational",
  notifications,
  onStatusClick,
}: SuperAdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SuperAdminProvider user={user}>
      <div className="min-h-screen bg-background">
        <Sidebar
          open={sidebarOpen}
          collapsed={collapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
        <div
          className={cn(
            "flex min-h-screen flex-col transition-all",
            collapsed ? "lg:pl-[72px]" : "lg:pl-64"
          )}
        >
          <TopNav
            onMenuClick={() => setSidebarOpen(true)}
            systemStatus={systemStatus}
            notifications={notifications}
            onStatusClick={onStatusClick}
          />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SuperAdminProvider>
  );
}
