import { ensureDbReady } from "@/lib/auth/init-super-admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { connectDB } from "@/lib/db/connect";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET() {
  try {
    await ensureDbReady();
    const { organizationId } = await requireAdmin();
    await connectDB();

    const oid = new mongoose.Types.ObjectId(organizationId);
    const orgUserIds = await User.find({ organizationId: oid, deletedAt: null }).select("_id").lean();
    const actorIds = orgUserIds.map((u) => u._id);

    const logs = await AuditLog.find({
      $or: [{ "metadata.organizationId": organizationId }, { actorId: { $in: actorIds } }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return apiSuccess({
      logs: logs.map((l) => ({
        id: l._id.toString(),
        description: l.description,
        actor: l.actorName,
        action: l.action,
        severity: l.severity,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
