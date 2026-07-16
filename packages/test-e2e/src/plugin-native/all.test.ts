import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider } from "../../../core/dist/index.mjs";
import { plugin } from "../../../plugin-native/dist/index.mjs";

describe("e2e native", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const creator = createTimeProvider.for(plugin);

    const system = creator.create();
    const fixed = creator.asFixed().create();
    const manual = creator.asManual().create();
    const sequential = creator.asSequential().create();

    expect(system.clock.utcNow().toString()).toBeDefined();
    expect(system.clock.localNow().toString()).toBeDefined();
    expect(system.parser.parse(new Date().getTime())).toBeDefined();

    expect(fixed.clock.utcNow().toString()).toBeDefined();
    expect(fixed.clock.localNow().toString()).toBeDefined();
    expect(fixed.parser.parse(new Date().toString()).getTime()).toBeDefined();

    expect(manual.clock.utcNow().toString()).toBeDefined();
    expect(manual.clock.localNow().toString()).toBeDefined();
    expect(manual.parser.parse(new Date().toString()).getTime()).toBeDefined();

    expect(sequential.clock.utcNow().toString()).toBeDefined();
    expect(sequential.clock.localNow().toString()).toBeDefined();
    expect(sequential.parser.parse(new Date().toString()).getTime()).toBeDefined();

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
  });
});
