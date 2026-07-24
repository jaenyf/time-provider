import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-temporal/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-temporal/dist/deterministic.mjs";
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
    expect(system.parser.parseToUtc(Temporal.Now.instant().epochMilliseconds)).toBeDefined();
    expect(system.parser.parseToLocal(Temporal.Now.instant().epochMilliseconds)).toBeDefined();

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

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
  });
});
