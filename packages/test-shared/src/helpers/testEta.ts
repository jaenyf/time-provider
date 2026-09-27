import { describe, test, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import type { IDeterministicPluggedRuntimeBuilder } from "@time-provider/core/deterministic";
import { toDuration, type ISystemPluggedRuntimeBuilder } from "@time-provider/core";
import { addon as deterministicEtaAddon } from "@time-provider/addon-eta/deterministic";
import {
  addon as systemEtaAddon,
  type IEtaDurationSnapshot,
  type IEtaProgressSnapshot,
  type WithEtaApi,
} from "@time-provider/addon-eta";

type Harness = {
  sut: WithEtaApi<unknown>;
  stepBackAnHour: () => void;
  pass: (milliseconds: number) => void;
};

/** Issue #178: the wall clock steps back an hour in the middle of a track. */
function testEtaAcrossBackwardStep(setup: () => Harness) {
  describe("issue#178", () => {
    test("an estimated-duration track measures elapsed time across a backward step", () => {
      const { sut, stepBackAnHour, pass } = setup();
      const snapshots: IEtaDurationSnapshot[] = [];
      sut.eta
        .estimate()
        .withEstimatedDuration(toDuration({ seconds: 60 }))
        .withNotificationInterval(toDuration({ seconds: 10 }))
        .start((snapshot) => snapshots.push(snapshot));
      pass(20_000);
      stepBackAnHour();
      pass(10_000);
      const last = snapshots.at(-1)!;
      expect([last.elapsedMilliseconds, last.remainingMilliseconds]).toEqual([30_000, 30_000]);
    });

    test("a known-total track keeps its rate across a backward step", () => {
      const { sut, stepBackAnHour, pass } = setup();
      const snapshots: IEtaProgressSnapshot[] = [];
      const tracker = sut.eta
        .estimate()
        .withKnownTotal(100)
        .withAlgorithm("complete")
        .start((snapshot) => snapshots.push(snapshot));
      pass(10_000);
      tracker.progress(10);
      stepBackAnHour();
      pass(10_000);
      tracker.progress(10);
      tracker.done();
      const last = snapshots.at(-1)!;
      expect([last.elapsedMilliseconds, last.rate]).toEqual([20_000, 0.2 / 20_000]);
    });
  });
}

export function testAddonEtaManual<TDate>(
  getBuilder: () => IDeterministicPluggedRuntimeBuilder<TDate>,
) {
  testEtaAcrossBackwardStep(() => {
    const timeProvider = getBuilder()
      .use(deterministicEtaAddon)
      .asManual()
      .withInitialTime("2026-01-01T12:00:00.000Z")
      .create();
    return {
      sut: timeProvider as unknown as WithEtaApi<unknown>,
      stepBackAnHour: () => timeProvider.clock.moveBy({ hours: -1 }, { as: "snap" }),
      pass: (milliseconds) => timeProvider.clock.moveBy({ milliseconds }),
    };
  });
}

export function testAddonEtaSystem<TDate>(getBuilder: () => ISystemPluggedRuntimeBuilder<TDate>) {
  describe("system", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });
    testEtaAcrossBackwardStep(() => ({
      sut: getBuilder().use(systemEtaAddon).create() as unknown as WithEtaApi<unknown>,
      stepBackAnHour: () => vi.setSystemTime(Date.now() - 3_600_000),
      pass: (milliseconds) => vi.advanceTimersByTime(milliseconds),
    }));
  });
}
