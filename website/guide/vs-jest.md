---
aside: false
---

# Compared to Jest

Each section below shows a test written with Jest's fake timers on the left and
the same test written with Time-Provider on the right. Every sample was run
against Jest 30.

## Setup

Both sides set up their clock inside each test. Jest patches the globals and has
to put them back with `jest.useRealTimers()`, which a failed assertion skips, so
the fake timers stay on for the tests that follow. A Time-Provider is a plain
object: `using` disposes of it when the test ends, failed or not, along with any
timer still pending.

<div class="tp-compare">
<div>

**Jest**

Nothing to import: `jest` is a global.

</div>
<div>

**Time-Provider**

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import type { IUtcOnlyTimeProvider } from "@time-provider/core";
```

</div>
</div>

`using` needs TypeScript 5.2 or later, or a Babel or SWC setup that supports
explicit resource management.

## A timeout fires after its delay

Time-Provider only controls the time it is given, so the code under test takes
it as a parameter.

::: details Code under test

<div class="tp-compare">
<div>

**Jest**

```ts
function scheduleReminder(send: () => void) {
  setTimeout(send, 5 * 60_000);
}
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
function scheduleReminder(
  timeProvider: IUtcOnlyTimeProvider<Date>,
  send: () => void,
) {
  timeProvider.scheduler.timers.once({ minutes: 5 }, send);
}
```

</div>
</div>

:::

<div class="tp-compare">
<div>

**Jest**

```ts
it("sends the reminder after 5 minutes", () => {
  jest.useFakeTimers();
  const send = jest.fn();
  scheduleReminder(send);

  jest.advanceTimersByTime(4 * 60_000);
  expect(send).not.toHaveBeenCalled();
  jest.advanceTimersByTime(60_000);
  expect(send).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
// roughly measured to run in 3.1 ms (see below).
```

</div>
<div>

**Time-Provider**

```ts
it("sends the reminder after 5 minutes", () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  let sent = 0;
  scheduleReminder(timeProvider, () => sent++);

  timeProvider.clock.moveBy({ minutes: 4 });
  expect(sent).toBe(0);
  timeProvider.clock.moveBy({ minutes: 1 });
  expect(sent).toBe(1);
});
// roughly measured to run in 1.8 ms (see below).
```

</div>
</div>

## An interval ticks

`startPolling` polls every 30 seconds.

::: details Code under test

<div class="tp-compare">
<div>

**Jest**

```ts
function startPolling(poll: () => void) {
  setInterval(poll, 30_000);
}
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
function startPolling(
  timeProvider: IUtcOnlyTimeProvider<Date>,
  poll: () => void,
) {
  timeProvider.scheduler.timers.every({ seconds: 30 }, poll);
}
```

</div>
</div>

:::

<div class="tp-compare">
<div>

**Jest**

```ts
it("polls four times in two minutes", () => {
  jest.useFakeTimers();
  const poll = jest.fn();
  startPolling(poll);

  jest.advanceTimersByTime(2 * 60_000);

  expect(poll).toHaveBeenCalledTimes(4);
  jest.useRealTimers();
});
// roughly measured to run in 0.8 ms (see below).
```

</div>
<div>

**Time-Provider**

```ts
it("polls four times in two minutes", () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  let polls = 0;
  startPolling(timeProvider, () => polls++);

  timeProvider.clock.moveBy({ minutes: 2 });

  expect(polls).toBe(4);
});
// roughly measured to run in 0.5 ms (see below).
```

</div>
</div>

## Reading the current time

`createOrder` stamps `createdAt` with the current time. A
[fixed clock](/guide/fixed-clock) never moves, so there is nothing to tick.

::: details Code under test

<div class="tp-compare">
<div>

**Jest**

```ts
function createOrder() {
  return { createdAt: new Date() };
}
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
function createOrder(
  timeProvider: IUtcOnlyTimeProvider<Date>,
) {
  return { createdAt: timeProvider.clock.utcNow() };
}
```

</div>
</div>

:::

<div class="tp-compare">
<div>

**Jest**

```ts
it("stamps the order", () => {
  const now = new Date("2026-01-01");
  jest.useFakeTimers({ now });

  expect(createOrder().createdAt).toEqual(now);
  jest.useRealTimers();
});
// roughly measured to run in 0.6 ms (see below).
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
it("stamps the order", () => {
  const now = new Date("2026-01-01");
  using timeProvider = createTimeProvider
    .for(plugin)
    .asFixed()
    .withFixedTime(now)
    .create();

  expect(createOrder(timeProvider).createdAt).toEqual(now);
});
// roughly measured to run in 0.5 ms (see below).
```

</div>
</div>

## Running the next timer, then all of them

`retry` tries again after 1, 2 and 4 seconds, scheduling each attempt from the
previous one.

::: details Code under test

<div class="tp-compare">
<div>

**Jest**

```ts
function retry(attempt: () => void, delay = 1000) {
  setTimeout(() => {
    attempt();
    if (delay < 4000) retry(attempt, delay * 2);
  }, delay);
}
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
function retry(
  timeProvider: IUtcOnlyTimeProvider<Date>,
  attempt: () => void,
  delay = 1000,
) {
  const { timers } = timeProvider.scheduler;
  timers.once({ milliseconds: delay }, () => {
    attempt();
    if (delay < 4000) retry(timeProvider, attempt, delay * 2);
  });
}
```

</div>
</div>

:::

<div class="tp-compare">
<div>

**Jest**

```ts
it("retries three times", () => {
  jest.useFakeTimers();
  const attempt = jest.fn();
  retry(attempt);

  jest.advanceTimersToNextTimer();
  expect(attempt).toHaveBeenCalledTimes(1);
  jest.runAllTimers();
  expect(attempt).toHaveBeenCalledTimes(3);
  jest.useRealTimers();
});
// roughly measured to run in 0.7 ms (see below).
```

</div>
<div>

**Time-Provider**

```ts
it("retries three times", () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  let attempts = 0;
  retry(timeProvider, () => attempts++);

  timeProvider.clock.moveTo("nextTimer");
  expect(attempts).toBe(1);
  timeProvider.clock.moveUntil("noTimers");
  expect(attempts).toBe(3);
});
// roughly measured to run in 0.5 ms (see below).
```

</div>
</div>

`moveTo("lastTimer")`, which runs up to the last pending timer, has no Jest
equivalent.

## Async code

`loadLater` waits one second, then loads. Jest needs `advanceTimersByTimeAsync`
so the promise callbacks get to run between timers. Time-Provider fires the
timer inside `moveBy()`, and the test awaits the result as usual.

::: details Code under test

<div class="tp-compare">
<div>

**Jest**

```ts
async function loadLater(load: () => string) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return load();
}
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
async function loadLater(
  timeProvider: IUtcOnlyTimeProvider<Date>,
  load: () => string,
) {
  await timeProvider.scheduler.timers.wait({ seconds: 1 });
  return load();
}
```

</div>
</div>

:::

<div class="tp-compare">
<div>

**Jest**

```ts
it("loads after a second", async () => {
  jest.useFakeTimers();
  const result = loadLater(() => "loaded");

  await jest.advanceTimersByTimeAsync(1000);

  expect(await result).toBe("loaded");
  jest.useRealTimers();
});
// roughly measured to run in 3.3 ms (see below).
```

</div>
<div>

**Time-Provider**

```ts
it("loads after a second", async () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  const result = loadLater(timeProvider, () => "loaded");

  timeProvider.clock.moveBy({ seconds: 1 });

  expect(await result).toBe("loaded");
});
// roughly measured to run in 0.4 ms (see below).
```

</div>
</div>

## Two reads that must differ

`publish` reads the time twice, for `savedAt` then `publishedAt`, with nothing
in between for a test to hook into. Fake timers can't move time between those
two reads. A [sequential clock](/guide/sequential-clock) returns the next
instant on each read.

::: details Code under test

<div class="tp-compare">
<div>

**Jest**

```ts
function publish() {
  const savedAt = Date.now();
  return { savedAt, publishedAt: Date.now() };
}
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
function publish(
  timeProvider: IUtcOnlyTimeProvider<Date>,
) {
  const savedAt = timeProvider.clock.utcNow();
  return { savedAt, publishedAt: timeProvider.clock.utcNow() };
}
```

</div>
</div>

:::

<div class="tp-compare">
<div>

**Jest**

Not supported.

</div>
<div>

**Time-Provider**

```ts
it("publishes after saving", () => {
  using timeProvider = createTimeProvider
    .for(plugin)
    .asSequential()
    .withSequentialTime(0)
    .withSequentialTime(250)
    .create();

  expect(publish(timeProvider)).toEqual({
    savedAt: new Date(0),
    publishedAt: new Date(250),
  });
});
// roughly measured to run in 0.5 ms (see below).
```

</div>
</div>

## Sleep

A check runs every minute, and the machine sleeps for eight hours. On wake-up
the overdue check runs once, not 480 times. Jest has no way to simulate that.

::: details Code under test

<div class="tp-compare">
<div>

**Jest**

```ts
function startChecking(check: () => void) {
  setInterval(check, 60_000);
}
```

</div>
<div>

**Time-Provider**

<!-- prettier-ignore -->
```ts
function startChecking(
  timeProvider: IUtcOnlyTimeProvider<Date>,
  check: () => void,
) {
  timeProvider.scheduler.timers.every({ minutes: 1 }, check);
}
```

</div>
</div>

:::

<div class="tp-compare">
<div>

**Jest**

Not supported.

</div>
<div>

**Time-Provider**

```ts
it("checks once after sleeping", () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  let checks = 0;
  startChecking(timeProvider, () => checks++);

  timeProvider.clock.moveBy({ hours: 8 }, { as: "sleep" });

  expect(checks).toBe(1);
});
// roughly measured to run in 0.4 ms (see below).
```

</div>
</div>

`jest.setSystemTime(t)` changes the wall clock without firing anything. That is
`moveTo(t, { as: "snap" })`, and a snap may go backward. See [Moving the
Clock](/guide/moving-the-clock).

## Other code in the same test

Jest replaces the timer globals, so every piece of code in the test runs on
the fake clock, not only the code under test. Here the in-memory database
answers through `setTimeout`, so saving never settles until something ticks
the clock, and the test times out. A Time-Provider leaves the globals alone.

::: details The in-memory database, the same on both sides

```ts
const user = { name: "Ada" };
const db = {
  save<T>(record: T) {
    return new Promise<T>((resolve) => {
      setTimeout(() => resolve(record), 5);
    });
  },
};
```

:::

<div class="tp-compare">
<div>

**Jest**

```ts
it("saves the user", async () => {
  jest.useFakeTimers();
  const saved = await db.save(user); // never settles

  expect(saved).toEqual(user);
  jest.useRealTimers();
});
// never finishes: the test times out.
```

</div>
<div>

**Time-Provider**

```ts
it("saves the user", async () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  const saved = await db.save(user);

  expect(saved).toEqual(user);
});
// roughly measured to run in 5.5 ms (see below).
```

</div>
</div>

## Animation frames

`spin` redraws on every frame. Jest fakes `requestAnimationFrame` only under
`testEnvironment: "jsdom"`, and fires frames on a 16ms grid, so a second holds
62 of them. The [animation-frame addon](/addons/animation-frame) runs at
60 frames per second by default, and `withHostFramesRate()` sets another rate.

<div class="tp-compare">
<div>

**Jest**

```ts
it("draws a second of frames", () => {
  jest.useFakeTimers();
  let frames = 0;
  const spin = () => {
    frames++;
    requestAnimationFrame(spin);
  };
  requestAnimationFrame(spin);

  jest.advanceTimersByTime(1000);

  expect(frames).toBe(62);
  jest.useRealTimers();
});
// roughly measured to run in 1.6 ms (see below).
```

</div>
<div>

**Time-Provider**

```ts
import { addon } from "@time-provider/addon-animation-frame/deterministic";

it("draws a second of frames", () => {
  using timeProvider = createTimeProvider.for(plugin).use(addon).asManual().create();
  const { animation } = timeProvider.scheduler;
  let frames = 0;
  const spin = () => {
    frames++;
    animation.scheduleFrame(spin);
  };
  animation.scheduleFrame(spin);

  timeProvider.clock.moveBy({ seconds: 1 });

  expect(frames).toBe(60);
});
// roughly measured to run in 1.3 ms (see below).
```

</div>
</div>

## Idle callbacks

Jest fakes `requestIdleCallback` only where the host has one, and jsdom has
none. With the [idle addon](/addons/idle), the test decides when the host is
idle and how many callbacks that idle period lets through.

<div class="tp-compare">
<div>

**Jest**

Not supported.

</div>
<div>

**Time-Provider**

```ts
import { addon } from "@time-provider/addon-idle/deterministic";

it("prefetches one page per idle period", () => {
  using timeProvider = createTimeProvider.for(plugin).use(addon).asManual().create();
  const { idle } = timeProvider.scheduler;
  const done: string[] = [];
  for (const url of ["/a", "/b"]) {
    idle.request(() => done.push(url));
  }

  // Idle long enough for one callback; drain(n) allows n.
  idle.drain(1);

  expect(done).toEqual(["/a"]);
});
// roughly measured to run in 0.7 ms (see below).
```

</div>
</div>

## Microtasks

A microtask queued by the test itself runs on demand. One queued from a timer
callback runs before the next timer, as it would on a real host.

<div class="tp-compare">
<div>

**Jest**

```ts
it("runs a queued microtask", () => {
  jest.useFakeTimers();
  const log: string[] = [];
  queueMicrotask(() => log.push("m"));

  jest.runAllTicks();

  expect(log).toEqual(["m"]);
  jest.useRealTimers();
});
// roughly measured to run in 0.6 ms (see below).

it("runs microtasks between timers", () => {
  jest.useFakeTimers();
  const log: string[] = [];
  setTimeout(() => {
    log.push("t1");
    queueMicrotask(() => log.push("m1"));
  }, 10);
  setTimeout(() => log.push("t2"), 10);

  jest.advanceTimersByTime(10);

  expect(log).toEqual(["t1", "m1", "t2"]);
  jest.useRealTimers();
});
// roughly measured to run in 0.9 ms (see below).
```

</div>
<div>

**Time-Provider**

```ts
it("runs a queued microtask", () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  const { microtasks } = timeProvider.scheduler;
  const log: string[] = [];
  microtasks.queue(() => log.push("m"));

  microtasks.drain();

  expect(log).toEqual(["m"]);
});
// roughly measured to run in 0.5 ms (see below).

it("runs microtasks between timers", () => {
  using timeProvider = createTimeProvider.for(plugin).asManual().create();
  const { timers, microtasks } = timeProvider.scheduler;
  const log: string[] = [];
  timers.once({ milliseconds: 10 }, () => {
    log.push("t1");
    microtasks.queue(() => log.push("m1"));
  });
  timers.once({ milliseconds: 10 }, () => log.push("t2"));

  timeProvider.clock.moveBy({ milliseconds: 10 });

  expect(log).toEqual(["t1", "m1", "t2"]);
});
// roughly measured to run in 0.5 ms (see below).
```

</div>
</div>

See [Microtasks](/guide/microtasks).

## How the timings were measured

Every sample on this page ran as a real test under Jest 30 on Node.js 22, with
TypeScript compiled by SWC. The Jest samples ran under `testEnvironment:
"jsdom"`, the Time-Provider ones under `"node"`. A wrapper around `it` read the
real `performance.now()`, saved before any fake timers were installed, just
before and just after the test body, so hooks and runner overhead are left out.
Each file ran seven times and the figure is the median. The first test of each
file includes warm-up. The numbers depend on the machine: compare the two
columns with each other, not with your own runs.
