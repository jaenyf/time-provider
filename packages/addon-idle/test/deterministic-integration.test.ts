import { describe, expect, test } from "vite-plus/test";
import {
  BaseManualRuntime,
  DEFAULT_MOVE_UNTIL_TIMERS_LIMIT,
  toInstant,
} from "@time-provider/core/deterministic";
import type { ITimeConverter } from "@time-provider/core";
import { addon as addonBuilderFactory } from "../src/deterministic.ts";
import type { IIdleDeadline, WithDeterministicIdleApi } from "../src/types.ts";

/*
 * A real manual runtime (same shape as core's own FakeManualRuntime test double), not the
 * recorded-calls fake used in deterministic.test.ts / deterministic-idle-scheduler.test.ts,
 * since a request `timeout` runs on the runtime's own timers.
 */
const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => toInstant({ milliseconds: Number(time) }),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};

class RealManualRuntime extends BaseManualRuntime<number> {
  constructor(initialTime: number) {
    super("Etc/UTC", initialTime, DEFAULT_MOVE_UNTIL_TIMERS_LIMIT, identityConverter);
  }
  protected advanceYears(time: number, years: number): number {
    return time + years * 365 * 24 * 60 * 60 * 1000;
  }
  protected advanceMonths(time: number, months: number): number {
    return time + months * 30 * 24 * 60 * 60 * 1000;
  }
}

function createIdleRuntime(): RealManualRuntime & WithDeterministicIdleApi {
  const runtime = new RealManualRuntime(0);
  addonBuilderFactory().create().applyToRuntime(runtime);
  return runtime as RealManualRuntime & WithDeterministicIdleApi;
}

describe("idleAddon (deterministic, real due-heap engine)", () => {
  test("a drained request receives a deadline that did not time out", () => {
    const runtime = createIdleRuntime();
    const deadlines: IIdleDeadline[] = [];
    runtime.scheduler.idle.request((deadline) => deadlines.push(deadline));
    runtime.scheduler.idle.drain();
    expect(deadlines.map((d) => [d.didTimeout, d.timeRemaining()])).toEqual([[false, 50]]);
  });

  test("a request still pending at its timeout runs once, with didTimeout set", () => {
    const runtime = createIdleRuntime();
    const deadlines: IIdleDeadline[] = [];
    runtime.scheduler.idle.request((deadline) => deadlines.push(deadline), { timeout: 100 });
    runtime.moveBy({ milliseconds: 99 });
    expect(deadlines).toEqual([]);
    runtime.moveBy({ milliseconds: 1 });
    expect(deadlines.map((d) => [d.didTimeout, d.timeRemaining()])).toEqual([[true, 0]]);
    expect(runtime.scheduler.idle.drain()).toBe(0);
  });

  test("a request drained before its timeout does not run again when it elapses", () => {
    const runtime = createIdleRuntime();
    let runs = 0;
    runtime.scheduler.idle.request(() => runs++, { timeout: 100 });
    runtime.scheduler.idle.drain();
    runtime.moveBy({ milliseconds: 100 });
    expect([runs, runtime.scheduler.timers.pendingCount]).toEqual([1, 0]);
  });

  test("disposing a request also cancels its timeout", () => {
    const runtime = createIdleRuntime();
    let runs = 0;
    runtime.scheduler.idle.request(() => runs++, { timeout: 100 }).dispose();
    runtime.moveBy({ milliseconds: 100 });
    expect([runs, runtime.scheduler.timers.pendingCount]).toEqual([0, 0]);
  });

  test.each([0, -1])("a timeout of %i never fires on its own", (timeout) => {
    const runtime = createIdleRuntime();
    let runs = 0;
    runtime.scheduler.idle.request(() => runs++, { timeout });
    runtime.moveBy({ days: 1 });
    expect([runs, runtime.scheduler.idle.pendingCount]).toEqual([0, 1]);
  });
});
