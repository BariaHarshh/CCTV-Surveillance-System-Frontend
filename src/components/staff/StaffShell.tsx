"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { StaffSidebar } from "./StaffSidebar";
import { StaffProvider } from "./StaffProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import type { SafeUser } from "@/lib/auth/sanitize-user";
import { cn } from "@/lib/utils";

export function StaffShell({ user, children }: { user: SafeUser; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();

  return (
    <StaffProvider user={user}>
      <div className="min-h-screen bg-background">
        <StaffSidebar user={user} open={sidebarOpen} collapsed={collapsed} onClose={() => setSidebarOpen(false)} onToggleCollapse={() => setCollapsed(!collapsed)} />
        <div className={cn("flex min-h-screen flex-col transition-all", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-background/80 px-4 backdrop-blur-xl lg:px-6">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-muted hover:text-white lg:hidden"><Menu className="h-5 w-5" /></button>
            <p className="text-sm text-muted">{user.name} · {user.userId}</p>
            <button type="button" onClick={() => logout()} className="text-sm text-accent hover:underline">Logout</button>
          </header>
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </StaffProvider>
  );
}
