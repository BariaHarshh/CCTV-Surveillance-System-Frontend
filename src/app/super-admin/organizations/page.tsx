import { getAuthSession } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/sanitize-user";
import { PlaceholderPage } from "@/components/super-admin/PlaceholderPage";

export default async function OrganizationsPage() {
  const session = await getAuthSession();
  if (!session) return null;
  return (
    <PlaceholderPage
      user={toSafeUser(session.user)}
      title="Organizations"
      description="Organization creation and full management will be available in Step 4. The dashboard already displays real organization counts from the database."
      actionLabel="Create Organization"
    />
  );
}
