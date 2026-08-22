import type { IUser } from "@/models/User";
import { Organization } from "@/models/Organization";
import { AuthError, requireAuth } from "@/lib/auth/session";
import { connectDB } from "@/lib/db/connect";

export interface OrgMemberContext {
  user: IUser;
  organizationId: string;
}

export async function requireOrgMember(roles: Array<"ADMIN" | "STAFF"> = ["ADMIN", "STAFF"]): Promise<OrgMemberContext> {
  const user = await requireAuth();

  if (!roles.includes(user.role as "ADMIN" | "STAFF")) {
    throw new AuthError("FORBIDDEN", "Access denied.");
  }

  if (user.status !== "ACTIVE") {
    throw new AuthError("FORBIDDEN", "Account is not active.");
  }

  if (!user.organizationId) {
    throw new AuthError("FORBIDDEN", "No organization assigned.");
  }

  await connectDB();
  const organization = await Organization.findOne({ _id: user.organizationId, deletedAt: null });
  if (!organization || organization.status !== "ACTIVE") {
    throw new AuthError("FORBIDDEN", "Organization not available.");
  }

  return { user, organizationId: organization._id.toString() };
}
