import { getAuthSession } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/sanitize-user";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";

const pages = {
  users: { title: "Users", description: "Campus user management will be expanded in a future release." },
  security: { title: "Security Activity", description: "Organization security activity feed will be expanded in Step 6." },
  sessions: { title: "Sessions", description: "Session management for your organization will be available soon." },
  reports: { title: "Reports", description: "Advanced reporting will be available in a future release." },
  profile: { title: "My Profile", description: "Admin profile management will be expanded in a future release." },
  settings: { title: "Settings", description: "Organization settings will be available in a future release." },
} as const;

export default async function AdminPlaceholderRoute({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getAuthSession();
  const { slug } = await params;
  const page = pages[slug as keyof typeof pages] ?? pages.profile;
  if (!session) return null;
  return <AdminPlaceholderPage user={toSafeUser(session.user)} title={page.title} description={page.description} />;
}
