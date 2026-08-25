"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { SuperAdminProvider } from "./SuperAdminProvider";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { cn } from "@/lib/utils";
import {
  ShellNestProvider,
  SuperAdminChromeProvider,
  useIsInsideShell,
  useSuperAdminChrome,
} from "@/components/shell/ShellChrome";
import { readPersistedBool, writePersistedBool } from "@/hooks/usePersistScroll";

interface SuperAdminShellProps {
  user: SafeUser;
  children: React.ReactNode;
  systemStatus?: "operational" | "degraded";
  notifications?: { id: string; description: string; time: string }[];
  onStatusClick?: () => void;
}

function SuperAdminShellFrame({
  user,
  children,
  systemStatus = "operational",
  notifications,
  onStatusClick,
}: SuperAdminShellProps) {
  const chromeCtx = useSuperAdminChrome();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readPersistedBool("super-admin-sidebar-collapsed", false));
  }, []);

  useEffect(() => {
    if (!chromeCtx) return;
    const patch: Parameters<typeof chromeCtx.setChrome>[0] = {};
    if (systemStatus !== undefined) patch.systemStatus = systemStatus;
    if (notifications !== undefined) patch.notifications = notifications;
    if (onStatusClick !== undefined) patch.onStatusClick = onStatusClick;
    if (Object.keys(patch).length) chromeCtx.setChrome(patch);
  }, [chromeCtx, systemStatus, notifications, onStatusClick]);

  const chrome = chromeCtx?.chrome ?? {};
  const status = chrome.systemStatus ?? systemStatus;
  const notifs = chrome.notifications ?? notifications;
  const statusClick = chrome.onStatusClick ?? onStatusClick;

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      writePersistedBool("super-admin-sidebar-collapsed", next);
      return next;
    });
  };

  return (
    <SuperAdminProvider user={user}>
      <div className="min-h-screen bg-background">
        <Sidebar
          open={sidebarOpen}
          collapsed={collapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={toggleCollapse}
        />
        <div
          className={cn(
            "flex min-h-screen flex-col transition-all",
            collapsed ? "lg:pl-[72px]" : "lg:pl-64"
          )}
        >
          <TopNav
            onMenuClick={() => setSidebarOpen(true)}
            systemStatus={status}
            notifications={notifs}
            onStatusClick={statusClick}
          />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SuperAdminProvider>
  );
}

function SuperAdminShellNestedForward({
  children,
  systemStatus,
  notifications,
  onStatusClick,
}: SuperAdminShellProps) {
  const chromeCtx = useSuperAdminChrome();

  useEffect(() => {
    if (!chromeCtx) return;
    const patch: Parameters<typeof chromeCtx.setChrome>[0] = {};
    if (systemStatus !== undefined) patch.systemStatus = systemStatus;
    if (notifications !== undefined) patch.notifications = notifications;
    if (onStatusClick !== undefined) patch.onStatusClick = onStatusClick;
    if (Object.keys(patch).length) chromeCtx.setChrome(patch);
  }, [chromeCtx, systemStatus, notifications, onStatusClick]);

  return <>{children}</>;
}

export function SuperAdminShell(props: SuperAdminShellProps) {
  const nested = useIsInsideShell();
  if (nested) return <SuperAdminShellNestedForward {...props} />;

  return (
    <ShellNestProvider>
      <SuperAdminChromeProvider>
        <SuperAdminShellFrame {...props} />
      </SuperAdminChromeProvider>
    </ShellNestProvider>
  );
}
