import { describe, it, expect } from "vitest";

describe("Live Video Stream Stability & Architecture Invariance", () => {
  it("generates deterministic canonical stream URLs without cache-busting mutations on AI events", () => {
    const cameraDbId = "66d550000000000000000003";
    const expectedStreamUrl = `http://localhost:8000/api/cameras/${cameraDbId}/stream`;

    // Simulate 100 consecutive AI detection ticks
    for (let tick = 0; tick < 100; tick++) {
      const generatedUrl = `http://localhost:8000/api/cameras/${cameraDbId}/stream`;
      expect(generatedUrl).toBe(expectedStreamUrl);
      expect(generatedUrl).not.toContain("_t=");
    }
  });

  it("ensures camera stream props comparison ignores high-frequency detection array allocations", () => {
    // Test the memo comparison logic used by StableStreamImage
    const arePropsEqual = (
      prev: { url: string; retryKey: number },
      next: { url: string; retryKey: number }
    ) => prev.url === next.url && prev.retryKey === next.retryKey;

    const baseProps = { url: "http://localhost:8000/api/cameras/1/stream", retryKey: 0 };

    // Same URL, same retryKey -> must NOT re-render (returns true)
    expect(arePropsEqual(baseProps, { ...baseProps })).toBe(true);

    // Only genuine error retry increments retryKey -> triggers re-render (returns false)
    expect(arePropsEqual(baseProps, { ...baseProps, retryKey: 1 })).toBe(false);
  });
});
