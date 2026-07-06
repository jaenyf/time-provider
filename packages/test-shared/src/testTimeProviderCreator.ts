import { expect, test, describe } from "vite-plus/test";
import { TimeProviderCreator, type IPlugin } from "@time-provider/core";

export function testTimeProviderCreator<TDate>(plugin: IPlugin<TDate>) {
  test("throws when forcing an unknown mode", () => {
    const sut = new TimeProviderCreator()
      .for(plugin)
      .as("unknownMode" as "fixed" | "manual" | "system");
    expect(() => {
      sut.create();
    }).toThrow("Unhandled plugin mode 'unknownMode'");
  });

  describe("system", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      const sut = new TimeProviderCreator().for(plugin).as("system").create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = new TimeProviderCreator().for(plugin).as("system").create();
      expect(typeof sut).toBe("object");
    });
    test("throws when omitting a plugin", () => {
      const sut = new TimeProviderCreator().as("system");
      expect(() => {
        sut.create();
      }).toThrow("Method 'for' has not been called with the plugin that should be used !");
    });
    test("throws when using withInitialTime", () => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .as("system")
        .withInitialTime("2026-01-01T00:00Z");
      expect(() => {
        sut.create();
      }).toThrow("An initial time can not be set when using 'system' mode");
    });
  });

  describe("fixed", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .as("fixed")
        .withInitialTime("2026-01-01T00:00Z")
        .create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .as("fixed")
        .withInitialTime("2026-01-01T00:00Z")
        .create();
      expect(typeof sut).toBe("object");
    });
    test("throws when omitting a plugin", () => {
      const sut = new TimeProviderCreator().as("fixed").withInitialTime("2026-01-01T00:00Z");
      expect(() => {
        sut.create();
      }).toThrow("Method 'for' has not been called with the plugin that should be used !");
    });
    test("throws when omitting withInitialTime", () => {
      const sut = new TimeProviderCreator().for(plugin).as("fixed");
      expect(() => {
        sut.create();
      }).toThrow("An initial time have to be set when using 'fixed' mode");
    });
  });

  describe("manual", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .as("manual")
        .withInitialTime("2026-01-01T00:00Z")
        .create();
      expect(sut).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      const sut = new TimeProviderCreator()
        .for(plugin)
        .as("manual")
        .withInitialTime("2026-01-01T00:00Z")
        .create();
      expect(typeof sut).toBe("object");
    });
    test("throws when omitting a plugin", () => {
      const sut = new TimeProviderCreator().as("manual").withInitialTime("2026-01-01T00:00Z");
      expect(() => {
        sut.create();
      }).toThrow("Method 'for' has not been called with the plugin that should be used !");
    });
    test("throws when omitting withInitialTime", () => {
      const sut = new TimeProviderCreator().for(plugin).as("manual");
      expect(() => {
        sut.create();
      }).toThrow("An initial time have to be set when using 'manual' mode");
    });
  });
}
