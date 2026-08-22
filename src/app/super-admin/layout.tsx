import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { ensureDbReady } from "@/lib/auth/init-super-admin";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureDbReady();
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?redirect=/super-admin&reason=session_required");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/forbidden");
  }

  // Pass user via context is handled in page components
  return <>{children}</>;
}
