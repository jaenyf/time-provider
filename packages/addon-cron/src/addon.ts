import { AddonHelper } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { CronScheduler } from "./cron-scheduler.ts";
import type { WithCronApi } from "./types.ts";

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
