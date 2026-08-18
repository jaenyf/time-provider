import { describe, expect, test } from "vite-plus/test";
import { BaseManualRuntime, toInstant } from "@time-provider/core/deterministic";
import type { ITimeConverter } from "@time-provider/core";
import { addon, createAddon } from "../src/deterministic.ts";
import type { WithAnimationFrameApi } from "../src/types.ts";

/*
 * A real manual runtime (same shape as core's own FakeManualRuntime test double), not the
 * recorded-calls fake used in deterministic.test.ts / deterministic-animation-frame.test.ts.
 * The addon's own unit tests only check delegation, so a genuinely self-rescheduling
 * requestAnimationFrame loop advanced across real time needs the real due-heap/advance()
 * engine underneath it to be exercised at all.
 */
const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => toInstant({ milliseconds: Number(time) }),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};

class RealManualRuntime extends BaseManualRuntime<number> {
  constructor(initialTime: number) {
    super("Etc/UTC", initialTime, identityConverter);
  }
  protected advanceYears(time: number, years: number): number {
    return time + years * 365 * 24 * 60 * 60 * 1000;
  }
  protected advanceMonths(time: number, months: number): number {
    return time + months * 30 * 24 * 60 * 60 * 1000;
  }
  protected advanceDays(time: number, days: number): number {
    return time + days * 24 * 60 * 60 * 1000;
  }
  protected advanceHours(time: number, hours: number): number {
    return time + hours * 60 * 60 * 1000;
  }
  protected advanceMinutes(time: number, minutes: number): number {
    return time + minutes * 60 * 1000;
  }
  protected advanceSeconds(time: number, seconds: number): number {
    return time + seconds * 1000;
  }
  protected advanceMilliseconds(time: number, milliseconds: number): number {
    return time + milliseconds;
  }
}

function createAnimatedRuntime(): RealManualRuntime & WithAnimationFrameApi {
  const runtime = new RealManualRuntime(0);
  return addon.applyToRuntime(runtime);
}

describe("animationFrameAddon (deterministic, real due-heap engine)", () => {
  test("a self-rescheduling requestAnimationFrame loop fires once per frame across a single large advance(), not once total", () => {
    const timeProvider = createAnimatedRuntime();
    let frameCount = 0;
    function loop() {
      frameCount++;
      timeProvider.animation.requestAnimationFrame(loop);
    }
    timeProvider.animation.requestAnimationFrame(loop);

    timeProvider.advance({ milliseconds: 1000 }); // ~60 frames at the default 60fps

    expect(frameCount).toBe(60);
  });

  test("gives the same total frame count whether advanced in one jump or several smaller ones", () => {
    const timeProvider = createAnimatedRuntime();
    let frameCount = 0;
    function loop() {
      frameCount++;
      timeProvider.animation.requestAnimationFrame(loop);
    }
    timeProvider.animation.requestAnimationFrame(loop);

    for (let i = 0; i < 5; i++) {
      timeProvider.advance({ milliseconds: 200 });
    }

    expect(frameCount).toBe(60);
  });

  test("respects a configured hostFramesRate for the frame count, not just the scheduled delay", () => {
    const runtime = new RealManualRuntime(0);
    const configured = createAddon().withHostFramesRate(90).applyToRuntime(runtime);
    let frameCount = 0;
    function loop() {
      frameCount++;
      configured.animation.requestAnimationFrame(loop);
    }
    configured.animation.requestAnimationFrame(loop);

    configured.advance({ milliseconds: 1000 }); // ~90 frames at 90fps

    expect(frameCount).toBe(90);
  });
});
