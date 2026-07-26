import { describe, test, expect } from "vite-plus/test";
import { DeterministicPerformance } from "../src/performance/deterministic-performance.ts";

describe("DeterministicPerformance", () => {
  const createUninitializedSUT = () => new DeterministicPerformance();

  describe("uninitialized", () => {
    const uninitializedErrorMessage = "Deterministic performance has not been initialized";
    test("now throws", () => {
      const sut = createUninitializedSUT();
      expect(() => sut.now()).toThrow(uninitializedErrorMessage);
    });
    test("measure throws", () => {
      const sut = createUninitializedSUT();
      expect(() => sut.measure("a")).toThrow(uninitializedErrorMessage);
    });
    test("measure throws", () => {
      const sut = createUninitializedSUT();
      expect(() => sut.timeOrigin).toThrow(uninitializedErrorMessage);
    });
  });
});
