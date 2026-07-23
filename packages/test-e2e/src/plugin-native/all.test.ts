import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-native/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-native/dist/deterministic.mjs";

describe("e2e native", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const systemCreator = createSystemTimeProvider.for(systemPlugin);
    const deterministicCreator = createDeterministicTimeProvider.for(deterministicPlugin);

    const system = systemCreator.create();
    const fixed = deterministicCreator.asFixed().create();
    const manual = deterministicCreator.asManual().create();
    const sequential = deterministicCreator.asSequential().create();

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

    expect(fixed.clock.utcNow().toString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = fixed.clock.localNow;
    //@ts-expect-error: withTimezone does not exist
    untracked = fixed.clock.withTimezone;
    expect(fixed.parser.parseToUtc(new Date().getTime())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = fixed.parser.parseToLocal;

    expect(manual.clock.utcNow().toString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = manual.clock.localNow;
    //@ts-expect-error: withTimezone does not exist
    untracked = manual.clock.withTimezone;
    expect(manual.parser.parseToUtc(new Date().getTime())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = manual.parser.parseToLocal;

    expect(sequential.clock.utcNow().toString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = sequential.clock.localNow;
    //@ts-expect-error: withTimezone does not exist
    untracked = sequential.clock.withTimezone;
    expect(sequential.parser.parseToUtc(new Date().getTime())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = sequential.parser.parseToLocal;

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();

    return untracked;
  });
});
