import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-native/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-native/dist/deterministic.mjs";
import { addon as systemAfapi } from "../../../addon-animation-frame/dist/index.mjs";
import { addon as deterministicAfapi } from "../../../addon-animation-frame/dist/deterministic.mjs";
import { addon as systemCron } from "../../../addon-cron/dist/index.mjs";
import { addon as deterministicCron } from "../../../addon-cron/dist/deterministic.mjs";
import "../polyfills.ts";

describe("e2e native", () => {
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

    //this variable in just here to satisfy the linter as we ensure expected errors from hidden runtime methods
    let untracked: unknown;

    expect(system.clock.utcNow().toString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = system.clock.localNow;
    //@ts-expect-error: withTimezone does not exist
    untracked = system.clock.withTimezone;
    expect(system.parser.parseToUtc(new Date().getTime())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = system.parser.parseToLocal;
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
    //@ts-expect-error: localNow does not exist
    untracked = fixed.clock.localNow;
    //@ts-expect-error: withTimezone does not exist
    untracked = fixed.clock.withTimezone;
    expect(fixed.parser.parseToUtc(new Date().getTime())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = fixed.parser.parseToLocal;
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
    //@ts-expect-error: localNow does not exist
    untracked = manual.clock.localNow;
    //@ts-expect-error: withTimezone does not exist
    untracked = manual.clock.withTimezone;
    expect(manual.parser.parseToUtc(new Date().getTime())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = manual.parser.parseToLocal;
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
    //@ts-expect-error: localNow does not exist
    untracked = sequential.clock.localNow;
    //@ts-expect-error: withTimezone does not exist
    untracked = sequential.clock.withTimezone;
    expect(sequential.parser.parseToUtc(new Date().getTime())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = sequential.parser.parseToLocal;
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

    return untracked;
  });
});
