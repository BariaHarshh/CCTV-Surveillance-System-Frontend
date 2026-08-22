import mongoose, { Schema, type Model } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> =
  mongoose.models.Counter ?? mongoose.model<ICounter>("Counter", CounterSchema);

export async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export async function formatOrgId(seq: number): Promise<string> {
  return `ORG-${String(seq).padStart(6, "0")}`;
}

export async function formatAdminId(seq: number): Promise<string> {
  return `ADM-${String(seq).padStart(6, "0")}`;
}

export async function formatStaffId(seq: number): Promise<string> {
  return `STF-${String(seq).padStart(6, "0")}`;
}
