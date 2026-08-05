import { describe, expect, test } from "vite-plus/test";
import "../polyfills.ts";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-dayjs/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-dayjs/dist/deterministic.mjs";
import { addon as systemAfapi } from "../../../addon-animation-frame/dist/index.mjs";
import { addon as deterministicAfapi } from "../../../addon-animation-frame/dist/deterministic.mjs";
import { addon as systemCron } from "../../../addon-cron/dist/index.mjs";
import { addon as deterministicCron } from "../../../addon-cron/dist/deterministic.mjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
dayjs.extend(utc);
dayjs.extend(timezone);

describe("e2e plugin-dayjs", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const systemBuilder = createSystemTimeProvider
      .for(systemPlugin)
      .use(systemAfapi)
      .use(systemCron);
    const deterministicBuilder = createDeterministicTimeProvider
      .for(deterministicPlugin)
      .use(deterministicAfapi)
      .withHostFramesRate(50)
      .use(deterministicCron);

    const system = systemBuilder.create();
    const fixed = deterministicBuilder.asFixed().create();
    const manual = deterministicBuilder.asManual().create();
    const sequential = deterministicBuilder.asSequential().create();

    expect(system.clock.utcNow().toISOString()).toBeDefined();
    expect(system.clock.localNow().toISOString()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(system.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(system.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(system.performance.now()).toBeDefined();
    expect(system.performance.timeOrigin).toBeDefined();
    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() =>
      system.animation.cancelAnimationFrame(system.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(
      system.cron.unschedule(
        system.cron.schedule(
          {
            month: { from: "JAN", to: "FEB" },
            dayOfMonth: "12",
            dayOfWeek: "FRI",
            hour: { from: 1, to: 2 },
            minute: { from: "3", to: "4" },
          },
          () => {},
        ),
      ),
    );

    expect(fixed.clock.utcNow().toISOString()).toBeDefined();
    expect(fixed.clock.localNow().toISOString()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(fixed.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(fixed.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(fixed.performance.now()).toBeDefined();
    expect(fixed.performance.timeOrigin).toBeDefined();
    expect(() => {
      fixed.scheduler.clearInterval(fixed.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      fixed.scheduler.clearTimeout(fixed.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() =>
      fixed.animation.cancelAnimationFrame(fixed.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(() =>
      fixed.animation.cancelAnimationFrame(fixed.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(
      fixed.cron.unschedule(
        fixed.cron.schedule(
          {
            month: { from: "JAN", to: "FEB" },
            dayOfMonth: "12",
            dayOfWeek: "FRI",
            hour: { from: 1, to: 2 },
            minute: { from: "3", to: "4" },
          },
          () => {},
        ),
      ),
    );

    expect(manual.clock.utcNow().toISOString()).toBeDefined();
    expect(manual.clock.localNow().toISOString()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(manual.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(manual.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(manual.performance.now()).toBeDefined();
    expect(manual.performance.timeOrigin).toBeDefined();
    expect(() => {
      manual.scheduler.clearInterval(manual.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      manual.scheduler.clearTimeout(manual.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() =>
      manual.animation.cancelAnimationFrame(manual.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(() =>
      manual.animation.cancelAnimationFrame(manual.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(
      manual.cron.unschedule(
        manual.cron.schedule(
          {
            month: { from: "JAN", to: "FEB" },
            dayOfMonth: "12",
            dayOfWeek: "FRI",
            hour: { from: 1, to: 2 },
            minute: { from: "3", to: "4" },
          },
          () => {},
        ),
      ),
    );

    expect(sequential.clock.utcNow().toISOString()).toBeDefined();
    expect(sequential.clock.localNow().toISOString()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(sequential.parser.parseToUtc(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(sequential.parser.parseToLocal(dayjs.utc().toISOString()).unix()).toBeDefined();
    expect(sequential.performance.now()).toBeDefined();
    expect(sequential.performance.timeOrigin).toBeDefined();
    expect(() => {
      sequential.scheduler.clearInterval(sequential.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      sequential.scheduler.clearTimeout(sequential.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() =>
      sequential.animation.cancelAnimationFrame(
        sequential.animation.requestAnimationFrame(() => {}),
      ),
    ).not.toThrow();
    expect(() =>
      sequential.animation.cancelAnimationFrame(
        sequential.animation.requestAnimationFrame(() => {}),
      ),
    ).not.toThrow();
    expect(
      sequential.cron.unschedule(
        sequential.cron.schedule(
          {
            month: { from: "JAN", to: "FEB" },
            dayOfMonth: "12",
            dayOfWeek: "FRI",
            hour: { from: 1, to: 2 },
            minute: { from: "3", to: "4" },
          },
          () => {},
        ),
      ),
    );
  });
});
