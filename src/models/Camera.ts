import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { CAMERA_STATUSES } from "@/lib/campus/constants";

export type CameraStatus = (typeof CAMERA_STATUSES)[number];

export interface ICameraConnection {
  streamUrl: string;
  protocol: string;
  connectionType: string;
  usernameEncrypted: string;
  passwordEncrypted: string;
}

export interface ICamera extends Document {
  _id: Types.ObjectId;
  cameraId: string;
  organizationId: Types.ObjectId;
  campusId: Types.ObjectId;
  buildingId: Types.ObjectId | null;
  roomId: Types.ObjectId | null;
  floor: number | null;
  areaLabel: string;
  name: string;
  type: string;
  manufacturer: string;
  deviceModel: string;
  serialNumber: string;
  connection: ICameraConnection;
  status: CameraStatus;
  lastSeen: Date | null;
  lastTestAt: Date | null;
  lastTestSuccess: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<ICameraConnection>(
  {
    streamUrl: { type: String, default: "" },
    protocol: { type: String, default: "RTSP" },
    connectionType: { type: String, default: "Wired" },
    usernameEncrypted: { type: String, default: "", select: false },
    passwordEncrypted: { type: String, default: "", select: false },
  },
  { _id: false }
);

const CameraSchema = new Schema<ICamera>(
  {
    cameraId: { type: String, required: true, unique: true, trim: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    campusId: { type: Schema.Types.ObjectId, ref: "Campus", required: true, index: true },
    buildingId: { type: Schema.Types.ObjectId, ref: "Building", default: null },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", default: null },
    floor: { type: Number, default: null },
    areaLabel: { type: String, default: "" },
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true },
    manufacturer: { type: String, default: "" },
    deviceModel: { type: String, default: "" },
    serialNumber: { type: String, default: "" },
    connection: { type: ConnectionSchema, default: () => ({}) },
    status: { type: String, enum: CAMERA_STATUSES, default: "OFFLINE" },
    lastSeen: { type: Date, default: null },
    lastTestAt: { type: Date, default: null },
    lastTestSuccess: { type: Boolean, default: null },
  },
  { timestamps: true }
);

CameraSchema.index({ organizationId: 1, status: 1 });

export const Camera: Model<ICamera> =
  mongoose.models.Camera ?? mongoose.model<ICamera>("Camera", CameraSchema);
