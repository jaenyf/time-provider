import { describe, expect, test } from "vite-plus/test";
import "./polyfills.ts";
import type {
  ISystemPlugin,
  ITimeProvider,
  IUtcOnlySystemPlugin,
  IUtcOnlyTimeProvider,
} from "../../core/dist/index.d.mts";
import { asap, createTimeProvider as createSystemTimeProvider } from "../../core/dist/index.mjs";
import {
  createTimeProvider as createDeterministicTimeProvider,
  type IDeterministicPlugin,
  type IUtcOnlyDeterministicPlugin,
} from "../../core/dist/deterministic.mjs";
import type { WithEtaApi } from "../../addon-eta/dist/index.d.mts";
import type { WithCronApi } from "../../addon-cron/dist/index.d.mts";
import type { WithAnimationFrameApi } from "../../addon-animation-frame/dist/index.d.mts";
import { addon as systemAfapi } from "../../addon-animation-frame/dist/index.mjs";
import { addon as deterministicAfapi } from "../../addon-animation-frame/dist/deterministic.mjs";
import { addon as systemCompat } from "../../addon-compat/dist/index.mjs";
import {
  addon as deterministicCompat,
  type WithCompatApi,
} from "../../addon-compat/dist/deterministic.mjs";
import { addon as systemCron } from "../../addon-cron/dist/index.mjs";
import { addon as deterministicCron } from "../../addon-cron/dist/deterministic.mjs";
import { addon as systemEta } from "../../addon-eta/dist/index.mjs";
import { addon as deterministicEta } from "../../addon-eta/dist/deterministic.mjs";

export class E2eHelper {
  static e2eTests<TDate>(
    systemPlugin: ISystemPlugin<TDate>,
    deterministicPlugin: IDeterministicPlugin<TDate>,
    underlyingISOString: () => string,
    underlyingStringifier: (time: TDate) => string,
    underlyingToMs: (time: TDate) => number,
  ) {
    const systemBuilder = createSystemTimeProvider
      .for(systemPlugin)
      .use(systemAfapi)
      .use(systemCompat)
      .use(systemCron)
      .use(systemEta);

    const deterministicBuilder = createDeterministicTimeProvider
      .for(deterministicPlugin)
      .use(deterministicAfapi)
      .withHostFramesRate(50)
      .use(deterministicCompat)
      .use(deterministicCron)
      .use(deterministicEta);

    {
      using system = systemBuilder.create();
      E2eHelper.testTimeProvider<TDate>(
        system,
        underlyingISOString,
        underlyingStringifier,
        underlyingToMs,
      );
    }

    {
      using fixed = deterministicBuilder.asFixed().create();
      E2eHelper.testTimeProvider(fixed, underlyingISOString, underlyingStringifier, underlyingToMs);
    }

    {
      using manual = deterministicBuilder.asManual().create();
      E2eHelper.testTimeProvider(
        manual,
        underlyingISOString,
        underlyingStringifier,
        underlyingToMs,
      );
    }

    {
      using sequential = deterministicBuilder.asSequential().create();
      E2eHelper.testTimeProvider(
        sequential,
        underlyingISOString,
        underlyingStringifier,
        underlyingToMs,
      );
    }
  }

  static e2eUtcOnlyTests<TDate>(
    systemPlugin: IUtcOnlySystemPlugin<TDate>,
    deterministicPlugin: IUtcOnlyDeterministicPlugin<TDate>,
    underlyingISOString: () => string,
    underlyingStringifier: (time: TDate) => string,
    underlyingToMs: (time: TDate) => number,
  ) {
    const systemBuilder = createSystemTimeProvider
      .for(systemPlugin)
      .use(systemAfapi)
      .use(systemCompat)
      .use(systemCron)
      .use(systemEta);

    const deterministicBuilder = createDeterministicTimeProvider
      .for(deterministicPlugin)
      .use(deterministicAfapi)
      .withHostFramesRate(50)
      .use(deterministicCompat)
      .use(deterministicCron)
      .use(deterministicEta);

    const system = systemBuilder.create();
    const fixed = deterministicBuilder.asFixed().create();
    const manual = deterministicBuilder.asManual().create();
    const sequential = deterministicBuilder.asSequential().create();

    E2eHelper.testUtcOnlyTimeProvider<TDate>(
      system,
      underlyingISOString,
      underlyingStringifier,
      underlyingToMs,
    );

    E2eHelper.testUtcOnlyTimeProvider(
      fixed,
      underlyingISOString,
      underlyingStringifier,
      underlyingToMs,
    );

    E2eHelper.testUtcOnlyTimeProvider(
      manual,
      underlyingISOString,
      underlyingStringifier,
      underlyingToMs,
    );

    E2eHelper.testUtcOnlyTimeProvider(
      sequential,
      underlyingISOString,
      underlyingStringifier,
      underlyingToMs,
    );
  }

  private static testTimeProvider<TDate>(
    timeProvider: ITimeProvider<TDate> &
      WithAnimationFrameApi &
      WithCompatApi &
      WithCronApi &
      WithEtaApi,
    underlyingISOString: () => string,
    underlyingStringifier: (time: TDate) => string,
    underlyingToMs: (time: TDate) => number,
  ) {
    E2eHelper.testUtcClock(timeProvider, underlyingStringifier);
    E2eHelper.testLocalClock(timeProvider, underlyingStringifier);
    E2eHelper.testUtcParser(timeProvider, underlyingISOString, underlyingToMs);
    E2eHelper.testLocalParser(timeProvider, underlyingISOString, underlyingToMs);
    E2eHelper.testPerformance(timeProvider);
    E2eHelper.testTimers(timeProvider);
    E2eHelper.testAddonAnimation(timeProvider);
    E2eHelper.testAddonCompat(timeProvider);
    E2eHelper.testAddonCron(timeProvider);
    E2eHelper.testAddonEta(timeProvider);
  }

  private static testUtcOnlyTimeProvider<TDate>(
    timeProvider: IUtcOnlyTimeProvider<TDate> &
      WithAnimationFrameApi &
      WithCompatApi &
      WithCronApi &
      WithEtaApi,
    underlyingISOString: () => string,
    underlyingStringifier: (time: TDate) => string,
    underlyingToMs: (time: TDate) => number,
  ) {
    E2eHelper.testUtcClock(timeProvider, underlyingStringifier);
    E2eHelper.testInexistantLocalClock(timeProvider);
    E2eHelper.testUtcParser(timeProvider, underlyingISOString, underlyingToMs);
    E2eHelper.testInexistantLocalParser(timeProvider);
    E2eHelper.testPerformance(timeProvider);
    E2eHelper.testTimers(timeProvider);
    E2eHelper.testAddonAnimation(timeProvider);
    E2eHelper.testAddonCompat(timeProvider);
    E2eHelper.testAddonCron(timeProvider);
    E2eHelper.testAddonEta(timeProvider);
  }

  private static testUtcClock<TDate>(
    timeProvider: ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>,
    underlyingStringifier: (time: TDate) => string,
  ) {
    describe("clock", () => {
      test("utc", () => {
        expect(underlyingStringifier(timeProvider.clock.utcNow())).toBeDefined();
      });
    });
  }

  private static testLocalClock<TDate>(
    timeProvider: ITimeProvider<TDate>,
    underlyingStringifier: (time: TDate) => string,
  ) {
    describe("clock", () => {
      test("local", () => {
        expect(underlyingStringifier(timeProvider.clock.localNow())).toBeDefined();
        expect(timeProvider.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
        expect(timeProvider.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
      });
    });
  }

  private static testInexistantLocalClock<TDate>(timeProvider: IUtcOnlyTimeProvider<TDate>) {
    describe("clock", () => {
      test("inexistant local", () => {
        //@ts-expect-error: localNow does not exist
        expect(timeProvider.clock.localNow).toBeTypeOf("function");
        //@ts-expect-error: withTimezone does not exist
        expect(timeProvider.clock.withTimezone).toBeTypeOf("function");
      });
    });
  }

  private static testUtcParser<TDate>(
    timeProvider: ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>,
    getISOString: () => string,
    underlyingToMs: (time: TDate) => number,
  ) {
    describe("parser", () => {
      test("utc", () => {
        expect(underlyingToMs(timeProvider.parser.parseToUtc(getISOString()))).toBeDefined();
      });
    });
  }

  private static testLocalParser<TDate>(
    timeProvider: ITimeProvider<TDate>,
    getISOString: () => string,
    underlyingToMs: (time: TDate) => number,
  ) {
    describe("parser", () => {
      test("local", () => {
        expect(underlyingToMs(timeProvider.parser.parseToLocal(getISOString()))).toBeDefined();
      });
    });
  }

  private static testInexistantLocalParser<TDate>(timeProvider: IUtcOnlyTimeProvider<TDate>) {
    describe("clock", () => {
      test("inexistant local", () => {
        //@ts-expect-error: localNow does not exist
        expect(timeProvider.parser.parseToLocal).toBeTypeOf("function");
      });
    });
  }

  private static testPerformance<TDate>(
    timeProvider: ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>,
  ) {
    expect(timeProvider.performance.now()).toBeDefined();
    expect(timeProvider.performance.timeOrigin).toBeDefined();
  }

  private static testTimers<TDate>(
    timeProvider: ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>,
  ) {
    expect(() => {
      timeProvider.timers.every(asap(), () => {}).dispose();
    }).not.toThrow();
    expect(() => {
      timeProvider.timers.recurring(() => false).dispose();
    }).not.toThrow();
    expect(() => {
      timeProvider.timers.once(asap(), () => {}).dispose();
    }).not.toThrow();
  }

  private static testAddonAnimation<TDate>(
    timeProvider: (ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>) & WithAnimationFrameApi,
  ) {
    expect(() =>
      timeProvider.animation.cancelAnimationFrame(
        timeProvider.animation.requestAnimationFrame(() => {}),
      ),
    ).not.toThrow();
  }

  private static testAddonCompat<TDate>(
    timeProvider: (ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>) & WithCompatApi,
  ) {
    expect(() => {
      timeProvider.compat.timers.clearInterval(timeProvider.compat.timers.setInterval(() => {}));
    }).not.toThrow("Method not implemented.");
    expect(() => {
      timeProvider.compat.timers.clearRecurring(
        timeProvider.compat.timers.setRecurring(() => false),
      );
    }).not.toThrow("Method not implemented.");
    expect(() => {
      timeProvider.compat.timers.clearTimeout(timeProvider.compat.timers.setTimeout(() => {}));
    }).not.toThrow("Method not implemented.");
  }

  private static testAddonCron<TDate>(
    timeProvider: (ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>) & WithCronApi,
  ) {
    expect(
      timeProvider.cron.unschedule(
        timeProvider.cron.schedule(
          {
            month: { from: "JAN", to: "FEB" },
            dayOfMonth: "12",
            dayOfWeek: "FRI",
            hour: { from: 1, to: 2 },
            minute: { from: "3", to: "4" },
          },
          () => {},
        ),
      ),
    );
  }

  private static testAddonEta<TDate>(
    timeProvider: (ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>) & WithEtaApi,
  ) {
    expect(() => {
      const eta = timeProvider.eta
        .estimate()
        .withEstimatedDuration(5000)
        .withNotificationInterval(500)
        .start((_status) => {});
      eta.done();
      eta.abandon();
    });
    expect(() => {
      const eta = timeProvider.eta
        .estimate()
        .withKnownTotal(100)
        .withAlgorithm("complete")
        .withNotificationInterval(500)
        .start((_status) => {});
      eta.progress(10);
      eta.progressTo(50);
      eta.done();
      eta.abandon();
    });
    expect(() => {
      const eta = timeProvider.eta
        .estimate()
        .withStages([
          { weight: 1, total: 1 },
          { weight: 1, total: 1 },
        ])
        .withAlgorithm("complete")
        .withNotificationInterval(500)
        .start((_status) => {});
      eta.progress(10);
      eta.progressTo(50);
      eta.nextStage();
      eta.done();
      eta.abandon();
    });
  }
}
