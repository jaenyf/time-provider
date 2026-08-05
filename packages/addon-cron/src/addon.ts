import { AddonHelper } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { CronScheduler } from "./cron-scheduler.ts";
import type { WithCronApi } from "./types.ts";

/*
 * Shared by both public entry points (index.ts for a system runtime, deterministic.ts for a
 * manual/fixed/sequential one): the addon only ever touches IScheduler.setRecurring,
 * IClock.timestampNow()/.timezone/.calendarAdapter, which every runtime kind implements
 * identically, so there's nothing for a system vs. deterministic version to actually do
 * differently. `calendarAdapter` is the plugin's own if it provides one, otherwise a shared
 * Gregorian/`Intl` default - see {@link ICalendarAdapter} - so cron's calendar/timezone
 * computation always matches whatever the rest of that runtime's date library does.
 */
function createAddon<TDate>(): IDeterministicAddon<TDate, WithCronApi> {
  return {
    applyToRuntime(runtime) {
      const timezone = (): string =>
        "timezone" in runtime.clock ? runtime.clock.timezone : "Etc/UTC";
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "cron",
        new CronScheduler(
          runtime.scheduler,
          () => runtime.clock.timestampNow(),
          timezone,
          runtime.clock.calendarAdapter,
        ),
        undefined as unknown as WithCronApi,
      );
    },
    clone(): IDeterministicAddon<TDate, WithCronApi> {
      return createAddon<TDate>();
    },
  };
}

export const addon: IDeterministicAddon<unknown, WithCronApi> = createAddon();
