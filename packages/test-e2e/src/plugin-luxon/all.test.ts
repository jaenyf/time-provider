import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider as createSystemTimeProvider } from "../../../core/dist/index.mjs";
import { createTimeProvider as createDeterministicTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin as systemPlugin } from "../../../plugin-luxon/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-luxon/dist/deterministic.mjs";
import { addon as systemAfapi } from "../../../addon-animation-frame/dist/index.mjs";
import { addon as deterministicAfapi } from "../../../addon-animation-frame/dist/deterministic.mjs";
import { addon as systemCron } from "../../../addon-cron/dist/index.mjs";
import { addon as deterministicCron } from "../../../addon-cron/dist/deterministic.mjs";
import { addon as systemEta } from "../../../addon-eta/dist/index.mjs";
import { addon as deterministicEta } from "../../../addon-eta/dist/deterministic.mjs";
import "../polyfills.ts";
import { DateTime } from "luxon";

describe("e2e luxon", () => {
  test("createTimeProvider for plugin returns a value", () => {
    const systemBuilder = createSystemTimeProvider
      .for(systemPlugin)
      .use(systemAfapi)
      .use(systemCron)
      .use(systemEta);
    const deterministicBuilder = createDeterministicTimeProvider
      .for(deterministicPlugin)
      .use(deterministicAfapi)
      .withHostFramesRate(50)
      .use(deterministicCron)
      .use(deterministicEta);

    const system = systemBuilder.create();
    const fixed = deterministicBuilder.asFixed().create();
    const manual = deterministicBuilder.asManual().create();
    const sequential = deterministicBuilder.asSequential().create();

    expect(system.clock.utcNow().toString()).toBeDefined();
    expect(system.clock.localNow().toString()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(system.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(system.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(system.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(system.performance.now()).toBeDefined();
    expect(system.performance.timeOrigin).toBeDefined();
    expect(() => {
      system.scheduler.clearInterval(system.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.clearTimeout(system.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() => {
      system.scheduler.queueMicrotask(() => {});
    }).not.toThrow();
    expect(() =>
      system.animation.cancelAnimationFrame(system.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(
      system.cron.unschedule(
        system.cron.schedule(
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
    expect(() => {
      const eta = system.eta
        .estimate()
        .withEstimatedDuration(5000)
        .withNotificationInterval(500)
        .start((_status) => {});
      eta.done();
      eta.abandon();
    });
    expect(() => {
      const eta = system.eta
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
      const eta = system.eta
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

    expect(fixed.clock.utcNow().toString()).toBeDefined();
    expect(fixed.clock.localNow().toString()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(fixed.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(fixed.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(fixed.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(fixed.performance.now()).toBeDefined();
    expect(fixed.performance.timeOrigin).toBeDefined();
    expect(() => {
      fixed.scheduler.clearInterval(fixed.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      fixed.scheduler.clearTimeout(fixed.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() => {
      fixed.scheduler.drainMicrotasks();
    }).not.toThrow();
    expect(() => {
      fixed.scheduler.queueMicrotask(() => {});
    }).not.toThrow();
    expect(() =>
      fixed.animation.cancelAnimationFrame(fixed.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(
      fixed.cron.unschedule(
        fixed.cron.schedule(
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
    expect(() => {
      const eta = fixed.eta
        .estimate()
        .withEstimatedDuration(5000)
        .withNotificationInterval(500)
        .start((_status) => {});
      eta.done();
      eta.abandon();
    });
    expect(() => {
      const eta = fixed.eta
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
      const eta = fixed.eta
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

    expect(manual.clock.utcNow().toString()).toBeDefined();
    expect(manual.clock.localNow().toString()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(manual.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(manual.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(manual.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(manual.performance.now()).toBeDefined();
    expect(manual.performance.timeOrigin).toBeDefined();
    expect(() => {
      manual.scheduler.clearInterval(manual.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      manual.scheduler.clearTimeout(manual.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() => {
      manual.scheduler.drainMicrotasks();
    }).not.toThrow();
    expect(() => {
      manual.scheduler.queueMicrotask(() => {});
    }).not.toThrow();
    expect(() =>
      manual.animation.cancelAnimationFrame(manual.animation.requestAnimationFrame(() => {})),
    ).not.toThrow();
    expect(
      manual.cron.unschedule(
        manual.cron.schedule(
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
    expect(() => {
      const eta = manual.eta
        .estimate()
        .withEstimatedDuration(5000)
        .withNotificationInterval(500)
        .start((_status) => {});
      eta.done();
      eta.abandon();
    });
    expect(() => {
      const eta = manual.eta
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
      const eta = manual.eta
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

    expect(sequential.clock.utcNow().toString()).toBeDefined();
    expect(sequential.clock.localNow().toString()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").localNow()).toBeDefined();
    expect(sequential.clock.withTimezone("Pacific/Kiritimati").utcNow()).toBeDefined();
    expect(sequential.parser.parseToUtc(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(sequential.parser.parseToLocal(DateTime.utc().toString()).toMillis()).toBeDefined();
    expect(sequential.performance.now()).toBeDefined();
    expect(sequential.performance.timeOrigin).toBeDefined();
    expect(() => {
      sequential.scheduler.clearInterval(sequential.scheduler.setInterval(() => {}));
    }).not.toThrow();
    expect(() => {
      sequential.scheduler.clearTimeout(sequential.scheduler.setTimeout(() => {}));
    }).not.toThrow();
    expect(() => {
      sequential.scheduler.drainMicrotasks();
    }).not.toThrow();
    expect(() => {
      sequential.scheduler.queueMicrotask(() => {});
    }).not.toThrow();
    expect(() =>
      sequential.animation.cancelAnimationFrame(
        sequential.animation.requestAnimationFrame(() => {}),
      ),
    ).not.toThrow();
    expect(
      sequential.cron.unschedule(
        sequential.cron.schedule(
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
    expect(() => {
      const eta = sequential.eta
        .estimate()
        .withEstimatedDuration(5000)
        .withNotificationInterval(500)
        .start((_status) => {});
      eta.done();
      eta.abandon();
    });
    expect(() => {
      const eta = sequential.eta
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
      const eta = sequential.eta
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
  });
});
