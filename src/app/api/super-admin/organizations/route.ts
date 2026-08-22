import { ensureDbReady } from "@/lib/auth/init-super-admin";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { getOrganizationsList } from "@/lib/super-admin/statistics";

export async function GET() {
  try {
    await ensureDbReady();
    await requireSuperAdmin();
    const organizations = await getOrganizationsList();
    return apiSuccess({ organizations });
  } catch (error) {
    return handleApiError(error);
  }
}
