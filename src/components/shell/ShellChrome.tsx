"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ShellNestContext = createContext(false);

/** True when already inside a portal shell (layout-mounted). */
export function useIsInsideShell() {
  return useContext(ShellNestContext);
}

export function ShellNestProvider({ children }: { children: ReactNode }) {
  return <ShellNestContext.Provider value={true}>{children}</ShellNestContext.Provider>;
}

export type AdminChromeState = {
  organizationName?: string;
  organizationStatus?: string;
  notifications?: { id: string; description: string; time: string }[];
};

type AdminChromeContextValue = {
  chrome: AdminChromeState;
  setChrome: (patch: Partial<AdminChromeState>) => void;
};

const AdminChromeContext = createContext<AdminChromeContextValue | null>(null);

export function AdminChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<AdminChromeState>({});
  const setChrome = useCallback((patch: Partial<AdminChromeState>) => {
    setChromeState((prev) => ({ ...prev, ...patch }));
  }, []);
  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome]);
  return <AdminChromeContext.Provider value={value}>{children}</AdminChromeContext.Provider>;
}

export function useAdminChrome() {
  return useContext(AdminChromeContext);
}

export type SuperAdminChromeState = {
  systemStatus?: "operational" | "degraded";
  notifications?: { id: string; description: string; time: string }[];
  onStatusClick?: () => void;
};

type SuperAdminChromeContextValue = {
  chrome: SuperAdminChromeState;
  setChrome: (patch: Partial<SuperAdminChromeState>) => void;
};

const SuperAdminChromeContext = createContext<SuperAdminChromeContextValue | null>(null);

export function SuperAdminChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<SuperAdminChromeState>({
    systemStatus: "operational",
  });
  const setChrome = useCallback((patch: Partial<SuperAdminChromeState>) => {
    setChromeState((prev) => ({ ...prev, ...patch }));
  }, []);
  const value = useMemo(() => ({ chrome, setChrome }), [chrome, setChrome]);
  return (
    <SuperAdminChromeContext.Provider value={value}>{children}</SuperAdminChromeContext.Provider>
  );
}

export function useSuperAdminChrome() {
  return useContext(SuperAdminChromeContext);
}
