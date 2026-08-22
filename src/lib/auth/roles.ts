export function formatRoleLabel(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Admin";
    case "STAFF":
      return "Staff";
    default:
      return role;
  }
}

export function getDefaultRedirectForRole(role: string, mustChangePassword = false): string {
  if (mustChangePassword && role === "ADMIN") {
    return "/first-login-password";
  }
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "ADMIN":
      return "/authenticated";
    case "STAFF":
      return "/authenticated";
    default:
      return "/authenticated";
  }
}

export function canAccessSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}
