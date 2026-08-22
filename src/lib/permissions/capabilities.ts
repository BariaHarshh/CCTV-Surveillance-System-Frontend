import type { IUser } from "@/models/User";

/** Map spec dot-notation to internal colon keys */
const PERMISSION_ALIASES: Record<string, string> = {
  "campus.view": "campus:view",
  "campus.edit": "campus:edit",
  "building.view": "building:view",
  "building.create": "building:create",
  "building.edit": "building:edit",
  "room.view": "room:view",
  "room.create": "room:create",
  "room.edit": "room:edit",
  "camera.view": "camera:view",
  "camera.create": "camera:create",
  "camera.edit": "camera:edit",
  "camera.test": "camera:test",
  "camera.delete": "camera:delete",
  "event.view": "monitoring:events",
  "alert.view": "monitoring:alerts",
  "monitoring.view": "monitoring:view",
  "alert.acknowledge": "alert:acknowledge",
  "alert.investigate": "alert:investigate",
  "alert.resolve": "alert:resolve",
  "alert.dismiss": "alert:dismiss",
  "report.view": "reports:view",
  "dashboard.view": "dashboard:view",
};

const LEGACY_ALIASES: Record<string, string[]> = {
  "camera:view": ["monitoring:cameras"],
  "campus:view": ["org:view"],
  "event.view": ["monitoring:events"],
  "alert.view": ["monitoring:alerts"],
};

export function normalizePermission(permission: string): string {
  return PERMISSION_ALIASES[permission] ?? permission;
}

export function can(user: Pick<IUser, "role" | "permissions"> | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;

  const normalized = normalizePermission(permission);
  const perms = user.permissions ?? [];

  if (perms.includes(normalized)) return true;

  const legacy = LEGACY_ALIASES[normalized];
  if (legacy?.some((p) => perms.includes(p))) return true;

  // Admin org:edit can edit campus
  if (normalized === "campus:edit" && perms.includes("org:edit")) return true;

  if (user.role === "ADMIN") {
    const adminLegacy: Record<string, string[]> = {
      "campus:view": ["org:view"],
      "campus:edit": ["org:edit"],
      "building:view": ["org:view", "monitoring:cameras"],
      "building:create": ["org:edit"],
      "building:edit": ["org:edit"],
      "building:status": ["org:edit"],
      "room:view": ["org:view"],
      "room:create": ["org:edit"],
      "room:edit": ["org:edit"],
      "room:status": ["org:edit"],
      "camera:view": ["monitoring:cameras", "monitoring:view"],
      "camera:create": ["org:edit"],
      "camera:edit": ["org:edit"],
      "camera:test": ["org:edit", "monitoring:cameras"],
      "camera:delete": ["org:edit"],
      "camera:status": ["org:edit"],
      "monitoring:view": ["monitoring:dashboard", "monitoring:cameras"],
      "alert:acknowledge": ["org:edit"],
      "alert:investigate": ["org:edit"],
      "alert:resolve": ["org:edit"],
      "alert:dismiss": ["org:edit"],
    };
    const grants = adminLegacy[normalized];
    if (grants?.some((p) => perms.includes(p))) return true;
  }

  return false;
}

export function canAny(user: Pick<IUser, "role" | "permissions"> | null | undefined, permissions: string[]): boolean {
  return permissions.some((p) => can(user, p));
}
