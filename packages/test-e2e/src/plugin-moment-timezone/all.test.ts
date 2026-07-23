import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-moment-timezone/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-moment-timezone/dist/deterministic.mjs";
import moment from "moment-timezone";

describe("e2e moment", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const systemCreator = createSystemTimeProvider.for(systemPlugin);
    const deterministicCreator = createDeterministicTimeProvider.for(deterministicPlugin);

    const system = systemCreator.create();
    const fixed = deterministicCreator.asFixed().create();
    const manual = deterministicCreator.asManual().create();
    const sequential = deterministicCreator.asSequential().create();

    expect(system.clock.utcNow().toISOString()).toBeDefined();
    expect(system.clock.localNow().toISOString()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(system.parser.parseToUtc(moment.utc().milliseconds())).toBeDefined();
    expect(system.parser.parseToLocal(moment.utc().milliseconds())).toBeDefined();

    expect(fixed.clock.utcNow().toISOString()).toBeDefined();
    expect(fixed.clock.localNow().toISOString()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(fixed.parser.parseToUtc(moment.utc().toISOString()).milliseconds()).toBeDefined();
    expect(fixed.parser.parseToLocal(moment.utc().toISOString()).milliseconds()).toBeDefined();

    expect(manual.clock.utcNow().toISOString()).toBeDefined();
    expect(manual.clock.localNow().toISOString()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(manual.parser.parseToUtc(moment.utc().toISOString()).milliseconds()).toBeDefined();
    expect(manual.parser.parseToLocal(moment.utc().toISOString()).milliseconds()).toBeDefined();

    expect(sequential.clock.utcNow().toISOString()).toBeDefined();
    expect(sequential.clock.localNow().toISOString()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(sequential.parser.parseToUtc(moment.utc().toISOString()).milliseconds()).toBeDefined();
    expect(sequential.parser.parseToLocal(moment.utc().toISOString()).milliseconds()).toBeDefined();

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
  });
});
