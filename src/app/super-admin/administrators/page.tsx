import { getAuthSession } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/sanitize-user";
import { PlaceholderPage } from "@/components/super-admin/PlaceholderPage";

export default async function AdministratorsPage() {
  const session = await getAuthSession();
  if (!session) return null;
  return (
    <PlaceholderPage
      user={toSafeUser(session.user)}
      title="Platform Administrators"
      description="Admin account creation and full administrator management will be available in Step 4. Existing admin accounts are listed on the dashboard with real data."
      actionLabel="+ Create Admin"
    />
  );
}
