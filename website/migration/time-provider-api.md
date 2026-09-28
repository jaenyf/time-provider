---
aside: false
---

# 2. Use the Time-Provider API

Compat keeps the native call shapes. The Time-Provider's own API reads
better: delays are durations instead of milliseconds, a handle cancels itself
with `dispose()`, and there are primitives with no native counterpart
(`wait`, `recurring`, [`cron`](/addons/cron)). Rewrite one call at a time;
both styles run on the same timers.

| Compat                                                           | Time-Provider API                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| `compat.setTimeout(fn, 5_000)`                                   | `scheduler.timers.once({ seconds: 5 }, fn)`          |
| `compat.setTimeout(fn, 5_000, a)`                                | `scheduler.timers.once({ seconds: 5 }, () => fn(a))` |
| `compat.setInterval(fn, 60_000)`                                 | `scheduler.timers.every({ minutes: 1 }, fn)`         |
| `compat.clearTimeout(h)`, `compat.clearInterval(h)`              | `h.dispose()`                                        |
| `compat.queueMicrotask(fn)`                                      | `scheduler.microtasks.queue(fn)`                     |
| `compat.requestAnimationFrame(fn)`                               | `scheduler.animation.scheduleFrame(fn)`              |
| `compat.requestIdleCallback(fn, { timeout: 1_000 })`             | `scheduler.idle.request(fn, { timeout: 1_000 })`     |
| `compat.cancelAnimationFrame(h)`, `compat.cancelIdleCallback(h)` | `h.dispose()`                                        |
| `compat.performance.now()`                                       | `clock.monotonicNow()`                               |
| `compat.performance.timeOrigin`                                  | `clock.monotonicOrigin`                              |
| `compat.performance.mark("a")`                                   | `timings.mark("a")`                                  |
| `compat.performance.measure("a-b", "a", "b")`                    | `timings.measure("a-b", { start: "a", end: "b" })`   |
| `compat.performance.getEntriesByName("a")`                       | `timings.entries({ name: "a" })`                     |
| `compat.performance.getEntriesByType("mark")`                    | `timings.entries({ kind: "mark" })`                  |
| `compat.performance.clearMarks("a")`                             | `timings.clear({ kind: "mark", name: "a" })`         |

Every member hangs off `timeProvider`. See the [API reference](/api/) for the
full signatures.

## Dates

`Date` never went through compat, so it moves here straight from the native
call. `utcNow()` and `localNow()` return the plugin's own date type: a `Date`
with `plugin-native`, a Day.js object with `plugin-dayjs`, and so on.

| Native                                     | Time-Provider API                                                  |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `Date.now()`                               | `clock.timestampNow()`                                             |
| `new Date()`                               | `clock.utcNow()`                                                   |
| `dayjs()`, `DateTime.now()`, `moment()`... | `clock.localNow()`, on a [timezone-aware plugin](/guide/timezones) |

## Patterns that get simpler

::: details A promise around `setTimeout`

<div class="tp-compare">
<div>

**Compat**

```ts
await new Promise<void>((resolve) => timeProvider.compat.setTimeout(resolve, 2_000));
```

</div>
<div>

**Time-Provider API**

```ts
await timeProvider.scheduler.timers.wait({ seconds: 2 });
```

</div>
</div>

:::

::: details A `setTimeout` that reschedules itself

<div class="tp-compare">
<div>

**Compat**

```ts
let delay = 1_000;
const retry = () => {
  if (trySend()) return;
  delay *= 2;
  timeProvider.compat.setTimeout(retry, delay);
};
timeProvider.compat.setTimeout(retry, delay);
```

</div>
<div>

**Time-Provider API**

```ts
let delay = 1_000;
timeProvider.scheduler.timers.recurring(
  () => (trySend() ? false : { milliseconds: (delay *= 2) }),
  { milliseconds: delay },
);
```

</div>
</div>

`recurring` returns one handle for the whole chain, so one `dispose()` stops it.

:::

::: details Cancelling with an `AbortSignal`

<div class="tp-compare">
<div>

**Compat**

```ts
const handle = timeProvider.compat.setTimeout(save, 5_000);
signal.addEventListener("abort", () => timeProvider.compat.clearTimeout(handle));
```

</div>
<div>

**Time-Provider API**

```ts
timeProvider.scheduler.timers.once({ seconds: 5 }, save, { signal });
```

</div>
</div>

:::

## Keep dates out too

Once a folder reads its dates from the clock, extend the
[ESLint config from step 1](/migration/#keep-migrated-files-clean) with two
rules that still allow `new Date(value)`:

```js
"no-restricted-properties": ["error", { object: "Date", property: "now" }],
"no-restricted-syntax": ["error", "NewExpression[callee.name='Date'][arguments.length=0]"],
```

Drop the compat addon when nothing calls it any more.
