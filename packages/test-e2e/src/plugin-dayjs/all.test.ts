import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider } from "../../../core/dist/index.mjs";
import { plugin } from "../../../plugin-dayjs/dist/index.mjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

describe("e2e plugin-dayjs", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const creator = createTimeProvider.for(plugin);

    const system = creator.create();
    const fixed = creator.asFixed().create();
    const manual = creator.asManual().create();
    const sequential = creator.asSequential().create();

    expect(system.clock.utcNow().toISOString()).toBeDefined();
    expect(system.clock.localNow().toISOString()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(system.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(system.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();

    expect(fixed.clock.utcNow().toISOString()).toBeDefined();
    expect(fixed.clock.localNow().toISOString()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(fixed.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(fixed.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();

    expect(manual.clock.utcNow().toISOString()).toBeDefined();
    expect(manual.clock.localNow().toISOString()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(manual.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(manual.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();

    expect(sequential.clock.utcNow().toISOString()).toBeDefined();
    expect(sequential.clock.localNow().toISOString()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(sequential.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(sequential.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
  });
});
