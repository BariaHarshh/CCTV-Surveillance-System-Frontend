import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { RESPONSE_TASK_STATUSES, TASK_PRIORITIES } from "@/lib/emergency/constants";

export interface IResponseTask extends Document {
  _id: Types.ObjectId;
  taskId: string;
  organizationId: Types.ObjectId;
  incidentId: Types.ObjectId | null;
  emergencyId: Types.ObjectId | null;
  title: string;
  description: string;
  assignedTo: Types.ObjectId | null;
  assignedToName: string;
  assignedTeam: Types.ObjectId | null;
  assignedTeamName: string;
  priority: (typeof TASK_PRIORITIES)[number];
  status: (typeof RESPONSE_TASK_STATUSES)[number];
  dueAt: Date | null;
  completedAt: Date | null;
  completedBy: Types.ObjectId | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResponseTaskSchema = new Schema<IResponseTask>(
  {
    taskId: { type: String, required: true, unique: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", default: null },
    emergencyId: { type: Schema.Types.ObjectId, ref: "Emergency", default: null },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedToName: { type: String, default: "" },
    assignedTeam: { type: Schema.Types.ObjectId, ref: "ResponseTeam", default: null },
    assignedTeamName: { type: String, default: "" },
    priority: { type: String, enum: TASK_PRIORITIES, default: "MEDIUM" },
    status: { type: String, enum: RESPONSE_TASK_STATUSES, default: "PENDING", index: true },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, default: "MANUAL" },
  },
  { timestamps: true }
);

ResponseTaskSchema.index({ organizationId: 1, emergencyId: 1, status: 1 });
ResponseTaskSchema.index({ organizationId: 1, incidentId: 1 });

export const ResponseTask: Model<IResponseTask> =
  mongoose.models.ResponseTask ?? mongoose.model<IResponseTask>("ResponseTask", ResponseTaskSchema);
