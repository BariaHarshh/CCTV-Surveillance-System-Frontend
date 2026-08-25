import { requireOrgMember } from "@/lib/auth/require-org-member";
import { apiError, apiSuccess, handleApiError } from "@/lib/api/response";
import { canDownloadEvidence } from "@/lib/video/permissions";
import { viewEvidence } from "@/lib/video/evidence-service";
import { connectDB } from "@/lib/db/connect";
import { VideoEvidenceAccessLog } from "@/models/Video";
import { orgFilter } from "@/lib/campus/service";

/**
 * Time-limited download consume — requires auth + permission + valid token audit trail.
 * Never serves permanent public URLs.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ videoEvidenceId: string }> }
) {
  try {
    const { user, organizationId } = await requireOrgMember();
    if (!canDownloadEvidence(user)) return apiError("Forbidden", 403, "FORBIDDEN");
    const { videoEvidenceId } = await context.params;
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token || token.length < 16) return apiError("Invalid or missing token", 403, "FORBIDDEN");

    await connectDB();
    const grant = await VideoEvidenceAccessLog.findOne(
      orgFilter(organizationId, {
        videoEvidenceId,
        action: { $in: ["DOWNLOADED", "SHARED"] },
        expiresAt: { $gt: new Date() },
      })
    ).sort({ createdAt: -1 });

    if (!grant) return apiError("Download authorization expired or missing", 403, "FORBIDDEN");

    const result = await viewEvidence(organizationId, user, videoEvidenceId);
    if (!result) return apiError("Not found", 404, "NOT_FOUND");
    if (!result.content) {
      return apiSuccess({
        available: false,
        message: result.message || "Recording unavailable.",
      });
    }

    return new Response(new Uint8Array(result.content), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${videoEvidenceId}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
