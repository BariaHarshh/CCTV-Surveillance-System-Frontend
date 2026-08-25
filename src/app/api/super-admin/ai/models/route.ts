import { ensureDbReady } from "@/lib/auth/init-super-admin";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { getAIStatus, getConfiguredProvider } from "@/lib/intelligence/providers";

export async function GET() {
  try {
    await ensureDbReady();
    await requireSuperAdmin();
    const status = getAIStatus();
    const provider = getConfiguredProvider();

    return apiSuccess({
      models: {
        configuredProvider: status.provider,
        available: status.available,
        mode: status.mode,
        model: status.model,
        baseUrlConfigured: Boolean(process.env.AI_BASE_URL),
        keyConfigured: Boolean(process.env.AI_PROVIDER_KEY || process.env.OPENAI_API_KEY),
        message: status.message,
        // Never expose secrets
        env: {
          AI_PROVIDER: process.env.AI_PROVIDER ?? "NONE",
          AI_MODEL: process.env.AI_MODEL ?? null,
          AI_BASE_URL: process.env.AI_BASE_URL ? "[configured]" : null,
          AI_PROVIDER_KEY: provider.available() ? "[configured]" : null,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
