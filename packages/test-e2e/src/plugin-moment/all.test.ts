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

    expect(system.clock.utcNow().toString()).toBeDefined();
    expect(system.clock.localNow().toString()).toBeDefined();
    expect(system.parser.parse(moment.utc().milliseconds())).toBeDefined();

    expect(fixed.clock.utcNow().toString()).toBeDefined();
    expect(fixed.clock.localNow().toString()).toBeDefined();
    expect(fixed.parser.parse(moment.utc().toString()).milliseconds()).toBeDefined();

    expect(manual.clock.utcNow().toString()).toBeDefined();
    expect(manual.clock.localNow().toString()).toBeDefined();
    expect(manual.parser.parse(moment.utc().toString()).milliseconds()).toBeDefined();

    expect(sequential.clock.utcNow().toString()).toBeDefined();
    expect(sequential.clock.localNow().toString()).toBeDefined();
    expect(sequential.parser.parse(moment.utc().toString()).milliseconds()).toBeDefined();

    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
  });
});
