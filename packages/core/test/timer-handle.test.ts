import { describe, expect, test } from "vite-plus/test";
import { TimerHandle } from "../src/runtimes/timer-handle.ts";
import { IRuntime, TIMER_KIND_TIMEOUT } from "../src/types/types.ts";

describe("timer-handle", () => {
  test("owner gets the corresponding owner", () => {
    const owner = {} as IRuntime<unknown>;
    const sut = new TimerHandle(TIMER_KIND_TIMEOUT, owner, undefined);
    expect(sut.owner).toBe(owner);
  });
});
