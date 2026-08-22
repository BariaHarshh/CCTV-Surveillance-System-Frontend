import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const ORGANIZATION_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"] as const;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  status: OrganizationStatus;
  contactEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ORGANIZATION_STATUSES,
      default: "PENDING",
    },
    contactEmail: { type: String, default: null, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ??
  mongoose.model<IOrganization>("Organization", OrganizationSchema);
