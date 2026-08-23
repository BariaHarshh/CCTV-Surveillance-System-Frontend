import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { INCIDENT_STATUSES } from "@/lib/ai/constants";
import { SEVERITY_LEVELS } from "@/lib/monitoring/constants";

export interface IIncidentLocation {
  campus?: string;
  building?: string;
  room?: string;
  camera?: string;
  label?: string;
}

export interface IIncident extends Document {
  _id: Types.ObjectId;
  incidentId: string;
  organizationId: Types.ObjectId;
  eventIds: Types.ObjectId[];
  alertIds: Types.ObjectId[];
  location: IIncidentLocation;
  severity: (typeof SEVERITY_LEVELS)[number];
  riskScore: number;
  status: (typeof INCIDENT_STATUSES)[number];
  assignedTo: Types.ObjectId | null;
  assignedToName: string;
  title: string;
  startedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: Types.ObjectId | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<IIncidentLocation>(
  { campus: String, building: String, room: String, camera: String, label: String },
  { _id: false }
);

const IncidentSchema = new Schema<IIncident>(
  {
    incidentId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    eventIds: [{ type: Schema.Types.ObjectId, ref: "Event" }],
    alertIds: [{ type: Schema.Types.ObjectId, ref: "Alert" }],
    location: { type: LocationSchema, default: () => ({}) },
    severity: { type: String, enum: SEVERITY_LEVELS, default: "MEDIUM" },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: INCIDENT_STATUSES, default: "OPEN", index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    assignedToName: { type: String, default: "" },
    title: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, default: "DETECTION" },
  },
  { timestamps: true }
);

IncidentSchema.index({ organizationId: 1, createdAt: -1 });

export const Incident: Model<IIncident> =
  mongoose.models.Incident ?? mongoose.model<IIncident>("Incident", IncidentSchema);
