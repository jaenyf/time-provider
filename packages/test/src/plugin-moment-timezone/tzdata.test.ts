import { describe, expect, test } from "vite-plus/test";
import moment from "moment-timezone";
import { createTimeProvider } from "@time-provider/core/deterministic";
import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { addon as cronAddon } from "@time-provider/addon-cron/deterministic";
import { plugin as momentTimezonePlugin } from "@time-provider/plugin-moment-timezone/deterministic";
import { plugin as luxonPlugin } from "@time-provider/plugin-luxon/deterministic";

const ZONE = "Africa/Casablanca";

function firstCronFire<TDate>(
  plugin: IDeterministicPlugin<TDate>,
  start: string,
): number | undefined {
  const timeProvider = createTimeProvider
    .for(plugin)
    .use(cronAddon)
    .withTimezone(ZONE)
    .asManual()
    .withInitialTime(start)
    .create();

  let fires = 0;
  let firstFireAt: number | undefined;
  timeProvider.cron.schedule("0 9 * * *", () => fires++);

  // Step an hour at a time so the instant of a fire is knowable - a single big advance() would
  // drain the whole batch with the clock already parked at its final target.
  for (let hour = 1; hour <= 24 && firstFireAt === undefined; hour++) {
    timeProvider.clock.advance({ hours: 1 });
    if (fires > 0) firstFireAt = Date.parse(start) + hour * 3_600_000;
  }
  return firstFireAt;
}

function icuLocalHour(epochMs: number, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "numeric" }).format(
      epochMs,
    ),
  );
}

/*
 * `createTimeProvider.for(momentTimezonePlugin)` promises the library behaves the way
 * moment-timezone does, and that has to include *which* timezone database decides a wall-clock
 * time - `luxonPlugin` here stands in for "the host's ICU", since Luxon has no bundled tzdata of
 * its own. The two genuinely disagree for zones whose rules changed recently - Morocco suspends
 * DST around Ramadan, and *which* Nov 15 disagrees keeps shifting as each dataset picks up
 * corrections at its own pace. Unlike `calendar-scheme.test.ts` (which compares against a small,
 * self-contained deterministic stand-in instead of the live host's ICU), reproducing that here
 * would mean forking this whole plugin's wiring just for one test, which isn't worth it - so this
 * searches for a divergent Nov 15 instead, and skips (rather than fails) if the host's actual ICU
 * has caught up on every year checked. This is a best-effort, environment-dependent confirmation
 * of the end-to-end consequence - a cron schedule reads in moment-timezone's answer, not the
 * engine's - not a guaranteed one; the real guarantee lives in `calendar-scheme.test.ts`.
 */
function findDivergentNov15(
  fromYear: number,
  toYear: number,
): { viaMomentTimezone: number; viaIcu: number } | undefined {
  for (let year = fromYear; year <= toYear; year++) {
    const start = `${year}-11-15T00:00:00.000Z`;
    const viaMomentTimezone = firstCronFire(momentTimezonePlugin, start);
    const viaIcu = firstCronFire(luxonPlugin, start);
    if (viaMomentTimezone !== undefined && viaIcu !== undefined && viaMomentTimezone !== viaIcu) {
      return { viaMomentTimezone, viaIcu };
    }
  }
  return undefined;
}

const divergence = findDivergentNov15(2026, 2126);

describe("plugin-moment-timezone tzdata", () => {
  test.skipIf(divergence === undefined)(
    "cron resolves local time through moment-timezone's bundled tzdata, not the host's ICU",
    () => {
      const { viaMomentTimezone, viaIcu } = divergence!;

      // Same expression, same zone, same instant - and a different answer, because the two
      // datasets put Casablanca on a different offset here.
      expect(viaMomentTimezone).not.toBe(viaIcu);

      // Each fire instant is 09:00 local by construction (that's what "0 9 * * *" asks for) -
      // checked against its own adapter's authority, not a hardcoded absolute instant that would
      // go stale the moment either dataset's Casablanca projection shifts again.
      expect(moment.tz(viaMomentTimezone, ZONE).format("HH:mm")).toBe("09:00");
      expect(icuLocalHour(viaIcu, ZONE)).toBe(9);
    },
  );
});
