import { getAuthSession } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/sanitize-user";
import { StaffSuccessClient } from "@/components/admin/StaffSuccessClient";

export default async function StaffSuccessPage() {
  const session = await getAuthSession();
  if (!session) return null;
  return <StaffSuccessClient user={toSafeUser(session.user)} />;
}
