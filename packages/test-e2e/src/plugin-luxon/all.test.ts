import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-luxon/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-luxon/dist/deterministic.mjs";
import { DateTime } from "luxon";

describe("e2e luxon", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const systemCreator = createSystemTimeProvider.for(systemPlugin);
    const deterministicCreator = createDeterministicTimeProvider.for(deterministicPlugin);

    const system = systemCreator.create();
    const fixed = deterministicCreator.asFixed().create();
    const manual = deterministicCreator.asManual().create();
    const sequential = deterministicCreator.asSequential().create();

    expect(system.clock.utcNow().toString()).toBeDefined();
    expect(system.clock.localNow().toString()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(system.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(system.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(fixed.clock.utcNow().toString()).toBeDefined();
    expect(fixed.clock.localNow().toString()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(fixed.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(fixed.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(manual.clock.utcNow().toString()).toBeDefined();
    expect(manual.clock.localNow().toString()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(manual.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(manual.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(sequential.clock.utcNow().toString()).toBeDefined();
    expect(sequential.clock.localNow().toString()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(sequential.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(sequential.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
  });
});
