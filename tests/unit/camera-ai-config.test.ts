import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import { getOrCreateCameraAIConfig } from "@/lib/ai/config-service";
import { Camera } from "@/models/Camera";
import { AIDetectionConfig } from "@/models/AIDetectionConfig";

vi.mock("@/lib/db/connect", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/models/Camera", () => ({
  Camera: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/models/AIDetectionConfig", () => ({
  AIDetectionConfig: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
  defaultModules: vi.fn().mockReturnValue({
    OCCUPANCY_DETECTION: { enabled: true },
    PERSON_DETECTION: { enabled: true },
  }),
}));

describe("getOrCreateCameraAIConfig - Camera ID Resolution", () => {
  const orgId = "66d550000000000000000001";
  const validHexId = "66d550000000000000000002";
  const mockCameraDocId = new mongoose.Types.ObjectId("6aa04eb3e6b715419a186006");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CASE A: resolves directly when cameraId is a valid 24-character hex MongoDB ObjectId", async () => {
    const mockConfig = {
      _id: "conf-1",
      organizationId: new mongoose.Types.ObjectId(orgId),
      cameraId: new mongoose.Types.ObjectId(validHexId),
      modules: {},
    };

    (AIDetectionConfig.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);

    const result = await getOrCreateCameraAIConfig(orgId, validHexId);

    // Camera.findOne should NOT be called since validHexId is already an ObjectId
    expect(Camera.findOne).not.toHaveBeenCalled();
    expect(AIDetectionConfig.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraId: new mongoose.Types.ObjectId(validHexId),
      })
    );
    expect(result).toBe(mockConfig);
  });

  it("CASE B: looks up Camera by application cameraId string and scopes by organizationId", async () => {
    const mockCamera = {
      _id: mockCameraDocId,
      cameraId: "CAM-000001",
      organizationId: new mongoose.Types.ObjectId(orgId),
      name: "Main Entrance Crowd Camera",
    };

    const mockConfig = {
      _id: "conf-2",
      organizationId: new mongoose.Types.ObjectId(orgId),
      cameraId: mockCameraDocId,
      modules: {},
    };

    (Camera.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockCamera);
    (AIDetectionConfig.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockConfig);

    const result = await getOrCreateCameraAIConfig(orgId, "CAM-000001");

    // Camera.findOne should be called with organizationId filter and cameraId: "CAM-000001"
    expect(Camera.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraId: "CAM-000001",
      })
    );

    // AIDetectionConfig.findOne should be called with resolved Camera._id
    expect(AIDetectionConfig.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        cameraId: mockCameraDocId,
      })
    );
    expect(result).toBe(mockConfig);
  });

  it("throws a clear error when application cameraId does not exist in the organization", async () => {
    (Camera.findOne as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(getOrCreateCameraAIConfig(orgId, "CAM-999999")).rejects.toThrow(
      "Camera 'CAM-999999' not found in organization."
    );

    expect(AIDetectionConfig.findOne).not.toHaveBeenCalled();
    expect(AIDetectionConfig.create).not.toHaveBeenCalled();
  });
});
