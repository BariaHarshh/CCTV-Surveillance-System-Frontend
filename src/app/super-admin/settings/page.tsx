import { getAuthSession } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/sanitize-user";
import { PlaceholderPage } from "@/components/super-admin/PlaceholderPage";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session) return null;
  return (
    <PlaceholderPage
      user={toSafeUser(session.user)}
      title="Platform Settings"
      description="Global platform configuration will be managed here in a future development step."
    />
  );
}
