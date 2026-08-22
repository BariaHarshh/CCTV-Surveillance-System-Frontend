import type { IUser } from "@/models/User";

export interface SafeUser {
  id: string;
  name: string;
  userId: string;
  email: string;
  role: string;
  organizationId: string | null;
  status: string;
}

export function toSafeUser(user: IUser): SafeUser {
  return {
    id: user._id.toString(),
    name: user.name,
    userId: user.userId,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId?.toString() ?? null,
    status: user.status,
  };
}

export function toSafeUserMinimal(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    userId: user.userId,
    role: user.role,
    organizationId: user.organizationId?.toString() ?? null,
  };
}
