import { describe, test, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import type { IDeterministicPluggedRuntimeBuilder } from "@time-provider/core/deterministic";
import type { ISystemPluggedRuntimeBuilder } from "@time-provider/core";
import { addon as deterministicCronAddon } from "@time-provider/addon-cron/deterministic";
import { addon as systemCronAddon } from "@time-provider/addon-cron";

/*
 * Drives occurrences with .asManual()/clock.advance(), the only deterministic kind that can move
 * its own clock forward.
 */
export function testAddonCronManual<TDate>(
  getBuilder: () => IDeterministicPluggedRuntimeBuilder<TDate>,
) {
  const createSUT = function () {
    return getBuilder()
      .use(deterministicCronAddon)
      .asManual()
      .withInitialTime("2026-01-01T00:00:00.000Z") // a Thursday
      .create();
  };

  describe("CronScheduler integration (manual)", () => {
    test("fires every occurrence a single advance() crosses, not just the first", () => {
      const sut = createSUT();

      let fires = 0;
      sut.cron.schedule("0 9-17 * * MON,FRI", () => {
        fires++;
      });

      // Crosses Friday 2026-01-02 and Monday 2026-01-05 - 9 hourly occurrences each.
      sut.clock.advance({ days: 5 });

      expect(fires).toBe(18);
    });

    test("keeps firing correctly across further advances, not just the first batch", () => {
      const sut = createSUT();

      let fires = 0;
      sut.cron.schedule("0 12 * * *", () => {
        fires++;
      });

      sut.clock.advance({ days: 3 });
      expect(fires).toBe(3); // 2026-01-01, -02, -03 at noon

      sut.clock.advance({ days: 2 });
      expect(fires).toBe(5); // + 2026-01-04, -05 at noon
    });

    test("unschedule() stops further occurrences mid-batch", () => {
      const sut = createSUT();

      let fires = 0;
      const handle = sut.cron.schedule("0 * * * *", () => {
        fires++;
        if (fires === 3) {
          sut.cron.unschedule(handle);
        }
      });

      sut.clock.advance({ hours: 10 });

      expect(fires).toBe(3);
    });
  });
}

/*
 * A fixed clock never advances (BaseFixedRuntime.mayRunDueCallbacks is a no-op), so a scheduled
 * occurrence can never become due - this only verifies scheduling doesn't fire prematurely or
 * throw on a frozen clock.
 */
export function testAddonCronFixed<TDate>(
  getBuilder: () => IDeterministicPluggedRuntimeBuilder<TDate>,
) {
  const createSUT = function () {
    return getBuilder()
      .use(deterministicCronAddon)
      .asFixed()
      .withFixedTime("2026-01-01T00:00:00.000Z")
      .create();
  };

  describe("CronScheduler integration (fixed)", () => {
    test("never fires: a fixed clock never advances", () => {
      const sut = createSUT();

      let fires = 0;
      sut.cron.schedule("* * * * *", () => {
        fires++;
      });

      sut.clock.utcNow();
      sut.clock.utcNow();

      expect(fires).toBe(0);
    });
  });
}

/*
 * A sequential clock only advances by being read via utcNow()/localNow() - one preset timestamp
 * consumed per read - so occurrences are driven by reading the clock instead of calling advance().
 * timestampNow() (what CronScheduler itself uses) never consumes a step, so the starting instant
 * given to schedule() is whatever the sequence's first entry is; every sequence here starts with
 * that starting instant as its own first entry, and the reads that actually matter for the
 * assertions come after it.
 */
export function testAddonCronSequential<TDate>(
  getBuilder: () => IDeterministicPluggedRuntimeBuilder<TDate>,
) {
  describe("CronScheduler integration (sequential)", () => {
    test("fires every occurrence a single read crosses, not just the first", () => {
      const sut = getBuilder()
        .use(deterministicCronAddon)
        .asSequential()
        .withSequentialTime("2026-01-01T00:00:00.000Z") // a Thursday - the starting instant
        .withSequentialTime("2026-01-06T00:00:00.000Z") // 5 days later
        .create();

      let fires = 0;
      sut.cron.schedule("0 9-17 * * MON,FRI", () => {
        fires++;
      });

      sut.clock.utcNow(); // consumes the starting instant, nothing due yet
      expect(fires).toBe(0);

      // Crosses Friday 2026-01-02 and Monday 2026-01-05 - 9 hourly occurrences each.
      sut.clock.utcNow();
      expect(fires).toBe(18);
    });

    test("keeps firing correctly across further reads, not just the first batch", () => {
      const sut = getBuilder()
        .use(deterministicCronAddon)
        .asSequential()
        .withSequentialTime("2026-01-01T00:00:00.000Z") // the starting instant
        .withSequentialTime("2026-01-04T00:00:00.000Z") // 3 days later
        .withSequentialTime("2026-01-06T00:00:00.000Z") // 2 more days
        .create();

      let fires = 0;
      sut.cron.schedule("0 12 * * *", () => {
        fires++;
      });

      sut.clock.utcNow(); // consumes the starting instant
      expect(fires).toBe(0);

      sut.clock.utcNow();
      expect(fires).toBe(3); // 2026-01-01, -02, -03 at noon

      sut.clock.utcNow();
      expect(fires).toBe(5); // + 2026-01-04, -05 at noon
    });

    test("unschedule() stops further occurrences mid-batch", () => {
      const sut = getBuilder()
        .use(deterministicCronAddon)
        .asSequential()
        .withSequentialTime("2026-01-01T00:00:00.000Z") // the starting instant
        .withSequentialTime("2026-01-01T10:00:00.000Z") // 10 hours later
        .create();

      let fires = 0;
      const handle = sut.cron.schedule("0 * * * *", () => {
        fires++;
        if (fires === 3) {
          sut.cron.unschedule(handle);
        }
      });

      sut.clock.utcNow(); // consumes the starting instant
      expect(fires).toBe(0);

      sut.clock.utcNow();
      expect(fires).toBe(3);
    });
  });
}

/*
 * A system runtime runs on the real clock, so occurrences are driven with fake timers instead of
 * clock.advance()/reading the sequence - vi.advanceTimersByTime() plays the same role here that
 * clock.advance() plays for the manual runtime.
 */
export function testAddonCronSystem<TDate>(getBuilder: () => ISystemPluggedRuntimeBuilder<TDate>) {
  const createSUT = () => getBuilder().use(systemCronAddon).create();

  describe("CronScheduler integration (system)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z")); // a Thursday
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    test("fires every occurrence a single timer advance crosses, not just the first", () => {
      const sut = createSUT();

      let fires = 0;
      sut.cron.schedule("0 9-17 * * MON,FRI", () => {
        fires++;
      });

      // Crosses Friday 2026-01-02 and Monday 2026-01-05 - 9 hourly occurrences each.
      vi.advanceTimersByTime(5 * 24 * 60 * 60 * 1000);

      expect(fires).toBe(18);
    });

    test("keeps firing correctly across further advances, not just the first batch", () => {
      const sut = createSUT();

      let fires = 0;
      sut.cron.schedule("0 12 * * *", () => {
        fires++;
      });

      vi.advanceTimersByTime(3 * 24 * 60 * 60 * 1000);
      expect(fires).toBe(3); // 2026-01-01, -02, -03 at noon

      vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
      expect(fires).toBe(5); // + 2026-01-04, -05 at noon
    });

    test("unschedule() stops further occurrences mid-batch", () => {
      const sut = createSUT();

      let fires = 0;
      const handle = sut.cron.schedule("0 * * * *", () => {
        fires++;
        if (fires === 3) {
          sut.cron.unschedule(handle);
        }
      });

      vi.advanceTimersByTime(10 * 60 * 60 * 1000);

      expect(fires).toBe(3);
    });
  });
}
