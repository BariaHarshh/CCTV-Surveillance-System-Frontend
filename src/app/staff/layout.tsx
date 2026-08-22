import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { ensureDbReady } from "@/lib/auth/init-super-admin";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await ensureDbReady();
  const session = await getAuthSession();
  if (!session) redirect("/login?redirect=/staff/dashboard&reason=session_required");
  if (session.user.role !== "STAFF") redirect("/forbidden");
  if (session.user.mustChangePassword) redirect("/change-password");
  return <>{children}</>;
}
