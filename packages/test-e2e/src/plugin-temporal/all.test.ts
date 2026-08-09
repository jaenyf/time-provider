import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-temporal/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-temporal/dist/deterministic.mjs";
import { addon as systemAfapi } from "../../../addon-animation-frame/dist/index.mjs";
import { addon as deterministicAfapi } from "../../../addon-animation-frame/dist/deterministic.mjs";
import { addon as systemCron } from "../../../addon-cron/dist/index.mjs";
import { addon as deterministicCron } from "../../../addon-cron/dist/deterministic.mjs";
import "../polyfills.ts";
import { Temporal } from "@js-temporal/polyfill";

/*
 * plugin-temporal assumes a global `Temporal` is already available.
 * Node/Bun don't ship Temporal natively yet, so this seeds it for the monorepo's own test run only
 */
if (!("Temporal" in globalThis)) {
  (globalThis as { Temporal?: unknown }).Temporal = Temporal;
}

describe("e2e temporal", () => {
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

    expect(system.clock.utcNow().toString()).toBeDefined();
    expect(system.clock.localNow().toString()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(system.parser.parseToUtc(Temporal.Now.instant().epochMilliseconds)).toBeDefined();
    expect(system.parser.parseToLocal(Temporal.Now.instant().epochMilliseconds)).toBeDefined();
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

    expect(fixed.clock.utcNow().toString()).toBeDefined();
    expect(fixed.clock.localNow().toString()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(
      fixed.parser.parseToUtc(Temporal.Now.instant().toString()).epochMilliseconds,
    ).toBeDefined();
    expect(
      fixed.parser.parseToLocal(Temporal.Now.instant().toString()).epochMilliseconds,
    ).toBeDefined();
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

    expect(manual.clock.utcNow().toString()).toBeDefined();
    expect(manual.clock.localNow().toString()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(
      manual.parser.parseToUtc(Temporal.Now.instant().toString()).epochMilliseconds,
    ).toBeDefined();
    expect(
      manual.parser.parseToLocal(Temporal.Now.instant().toString()).epochMilliseconds,
    ).toBeDefined();
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

    expect(sequential.clock.utcNow().toString()).toBeDefined();
    expect(sequential.clock.localNow().toString()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(
      sequential.parser.parseToUtc(Temporal.Now.instant().toString()).epochMilliseconds,
    ).toBeDefined();
    expect(
      sequential.parser.parseToLocal(Temporal.Now.instant().toString()).epochMilliseconds,
    ).toBeDefined();
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
