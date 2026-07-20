import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider } from "../../../core/dist/index.mjs";
import { plugin } from "../../../plugin-moment/dist/index.mjs";
import moment from "moment";

describe("e2e moment", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const creator = createTimeProvider.for(plugin);

    const system = creator.create();
    const fixed = creator.asFixed().create();
    const manual = creator.asManual().create();
    const sequential = creator.asSequential().create();

    //this variable in just here to satisfy the linter as we ensure expected errors from hidden runtime methods
    let untracked: unknown;

    expect(system.clock.utcNow().toISOString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = system.clock.localNow;
    //@ts-expect-error: withLocalTimezone does not exist
    untracked = system.clock.withLocalTimezone;
    expect(system.parser.parseToUtc(moment.utc().milliseconds())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = system.parser.parseToLocal;

    expect(fixed.clock.utcNow().toISOString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = fixed.clock.localNow;
    //@ts-expect-error: withLocalTimezone does not exist
    untracked = fixed.clock.withLocalTimezone;
    expect(system.parser.parseToUtc(moment.utc().milliseconds())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = system.parser.parseToLocal;

    expect(manual.clock.utcNow().toISOString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = manual.clock.localNow;
    //@ts-expect-error: withLocalTimezone does not exist
    untracked = manual.clock.withLocalTimezone;
    expect(system.parser.parseToUtc(moment.utc().milliseconds())).toBeDefined();
    //@ts-expect-error: parseToLocal does not exist
    untracked = manual.parser.parseToLocal;

    expect(sequential.clock.utcNow().toISOString()).toBeDefined();
    //@ts-expect-error: localNow does not exist
    untracked = sequential.clock.localNow;
    //@ts-expect-error: withLocalTimezone does not exist
    untracked = sequential.clock.withLocalTimezone;
    expect(sequential.parser.parseToUtc(moment.utc().milliseconds())).toBeDefined();
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
