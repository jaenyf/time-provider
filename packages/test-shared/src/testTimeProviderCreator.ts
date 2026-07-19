import { expect, test, describe } from "vite-plus/test";
import { TimeProviderCreator, type IPlugin, type IUtcOnlyPlugin } from "@time-provider/core";

function forPlugin<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
  return plugin.supportsLocalTime
    ? new TimeProviderCreator().for(plugin)
    : new TimeProviderCreator().for(plugin);
}

export function testTimeProviderCreator<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
  describe("system", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = forPlugin(plugin).create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = forPlugin(plugin).create();
      expect(typeof sut).toBe("object");
    });
  });

  describe("fixed", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = forPlugin(plugin).asFixed().withFixedTime("2026-01-01T00:00Z").create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = forPlugin(plugin).asFixed().withFixedTime("2026-01-01T00:00Z").create();
      expect(typeof sut).toBe("object");
    });
    test("uses default epoch time", () => {
      const sut = forPlugin(plugin).asFixed().create();
      expect(sut.clock.utcNow()).toEqual(sut.parser.parse(0));
    });
  });

  describe("manual", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = forPlugin(plugin).asManual().withInitialTime("2026-01-01T00:00Z").create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = forPlugin(plugin).asManual().withInitialTime("2026-01-01T00:00Z").create();
      expect(typeof sut).toBe("object");
    });
    test("uses default epoch time", () => {
      const sut = forPlugin(plugin).asManual().create();
      expect(sut.clock.utcNow()).toEqual(sut.parser.parse(0));
    });
  });

  describe("sequential", () => {
    test.each([null, undefined])("returns a value", (undefinedValue: unknown) => {
      const sut = forPlugin(plugin).asSequential().withSequentialTime("2026-01-01T00:00Z").create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = forPlugin(plugin).asSequential().withSequentialTime("2026-01-01T00:00Z").create();
      expect(typeof sut).toBe("object");
    });
    test("uses default epoch time", () => {
      const sut = forPlugin(plugin).asSequential().create();
      expect(sut.clock.utcNow()).toEqual(sut.parser.parse(0));
    });
  });
}
