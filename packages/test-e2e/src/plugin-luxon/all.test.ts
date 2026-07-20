import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider } from "../../../core/dist/index.mjs";
import { plugin } from "../../../plugin-luxon/dist/index.mjs";
import { DateTime } from "luxon";

describe("e2e luxon", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const creator = createTimeProvider.for(plugin);

    const system = creator.create();
    const fixed = creator.asFixed().create();
    const manual = creator.asManual().create();
    const sequential = creator.asSequential().create();

    expect(system.clock.utcNow().toString()).toBeDefined();
    expect(system.clock.localNow().toString()).toBeDefined();
    expect(system.clock.withLocalTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(system.clock.withLocalTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(system.parser.parse(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(fixed.clock.utcNow().toString()).toBeDefined();
    expect(fixed.clock.localNow().toString()).toBeDefined();
    expect(fixed.clock.withLocalTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(fixed.clock.withLocalTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(fixed.parser.parse(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(manual.clock.utcNow().toString()).toBeDefined();
    expect(manual.clock.localNow().toString()).toBeDefined();
    expect(manual.clock.withLocalTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(manual.clock.withLocalTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(manual.parser.parse(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(sequential.clock.utcNow().toString()).toBeDefined();
    expect(sequential.clock.localNow().toString()).toBeDefined();
    expect(sequential.clock.withLocalTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(sequential.clock.withLocalTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(sequential.parser.parse(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
  });
});
