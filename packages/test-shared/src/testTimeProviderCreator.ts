import { expect, test, describe } from "vite-plus/test";
import { TimeProviderCreator, type IPlugin } from "@time-provider/core";

export function testTimeProviderCreator<TDate>(plugin: IPlugin<TDate>) {
  describe("system", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = new TimeProviderCreator().for(plugin).create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = new TimeProviderCreator().for(plugin).create();
      expect(typeof sut).toBe("object");
    });
  });

  describe("fixed", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .asFixed()
        .withFixedTime("2026-01-01T00:00Z")
        .create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .asFixed()
        .withFixedTime("2026-01-01T00:00Z")
        .create();
      expect(typeof sut).toBe("object");
    });
    test("uses default EPOCH time", () => {
      const sut = new TimeProviderCreator().for(plugin).asFixed().create();
      expect(sut.utcNow()).toEqual(sut.parse(0));
    });
  });

  describe("manual", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .asManual()
        .withInitialTime("2026-01-01T00:00Z")
        .create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .asManual()
        .withInitialTime("2026-01-01T00:00Z")
        .create();
      expect(typeof sut).toBe("object");
    });
    test("uses default EPOCH time", () => {
      const sut = new TimeProviderCreator().for(plugin).asManual().create();
      expect(sut.utcNow()).toEqual(sut.parse(0));
    });
  });

  describe("sequential", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .asSequential()
        .withSequentialTime("2026-01-01T00:00Z")
        .create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .asSequential()
        .withSequentialTime("2026-01-01T00:00Z")
        .create();
      expect(typeof sut).toBe("object");
    });
    test("uses default EPOCH time", () => {
      const sut = new TimeProviderCreator().for(plugin).asSequential().create();
      expect(sut.utcNow()).toEqual(sut.parse(0));
    });
  });
}
