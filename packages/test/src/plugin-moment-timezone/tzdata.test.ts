import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider } from "@time-provider/core/deterministic";
import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { addon as cronAddon } from "@time-provider/addon-cron/deterministic";
import { plugin as momentTimezonePlugin } from "@time-provider/plugin-moment-timezone/deterministic";
import { plugin as luxonPlugin } from "@time-provider/plugin-luxon/deterministic";

/*
 * `createTimeProvider.for(momentTimezonePlugin)` promises the library behaves the way
 * moment-timezone does, and that has to include *which* timezone database decides a wall-clock
 * time. moment-timezone ships a static tzdata copy the consumer pins and updates themselves;
 * every other plugin here reads the host's ICU, which travels with the JS engine. The two
 * genuinely disagree for zones whose rules changed recently.
 *
 * Morocco is one: it suspends DST around Ramadan and the dates move every year, so the datasets
 * drift apart whenever one is refreshed before the other. This pins the end-to-end consequence -
 * a cron schedule reads in moment-timezone's answer, not the engine's.
 */
const ZONE = "Africa/Casablanca";
const START = "2026-11-15T00:00:00.000Z";

function firstCronFire<TDate>(plugin: IDeterministicPlugin<TDate>): number | undefined {
  const timeProvider = createTimeProvider
    .for(plugin)
    .use(cronAddon)
    .withTimezone(ZONE)
    .asManual()
    .withInitialTime(START)
    .create();

  let fires = 0;
  let firstFireAt: number | undefined;
  timeProvider.cron.schedule("0 9 * * *", () => fires++);

  // Step an hour at a time so the instant of a fire is knowable - a single big advance() would
  // drain the whole batch with the clock already parked at its final target.
  for (let hour = 1; hour <= 24 && firstFireAt === undefined; hour++) {
    timeProvider.clock.advance({ hours: 1 });
    if (fires > 0) firstFireAt = Date.parse(START) + hour * 3_600_000;
  }
  return firstFireAt;
}

describe("plugin-moment-timezone tzdata", () => {
  test("cron resolves local time through moment-timezone's bundled tzdata, not the host's ICU", () => {
    const viaMomentTimezone = firstCronFire(momentTimezonePlugin);
    const viaIcu = firstCronFire(luxonPlugin);

    // Same expression, same zone, same instant - and a different answer, because the two
    // datasets put Casablanca on a different offset here.
    expect(viaMomentTimezone).not.toBe(viaIcu);

    // moment-timezone has Casablanca at UTC+0 on this date, so 09:00 local is 09:00Z.
    expect(new Date(viaMomentTimezone!).toISOString()).toBe("2026-11-15T09:00:00.000Z");
    // The host's ICU has it at UTC+1, so 09:00 local is 08:00Z.
    expect(new Date(viaIcu!).toISOString()).toBe("2026-11-15T08:00:00.000Z");
  });
});
