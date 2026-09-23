# Compatibility Layer

[`@time-provider/addon-compat`](https://www.npmjs.com/package/@time-provider/addon-compat)
adds a `.compat` facade exposing native-style `setTimeout`/`setInterval`/`queueMicrotask`
call signatures on top of a Time-Provider's own timers, plus the `performance`
members — `now`, `timeOrigin`, `mark`, `measure` and friends — flat beside
them. Like every
[addon](/addons/) it composes in with `.use(addon)` and ships two entry
points — one for a system Time-Provider, one for a deterministic one:

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-compat";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

const handle = timeProvider.compat.setTimeout(() => console.log("tick"), 500);
timeProvider.compat.clearTimeout(handle);
```

On a deterministic Time-Provider the same calls run against that runtime's own
simulated clock, so code written against this facade is testable the same way
as code written against `.scheduler`:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-compat/deterministic";

const manual = createTimeProvider.for(plugin).use(addon).asManual().withInitialTime(0).create();

let ticks = 0;
manual.compat.setInterval(() => ticks++, 1000);
manual.clock.advance({ seconds: 3 });
console.log(ticks); // 3
```

## Why this facade exists

`.scheduler` (`once`/`every`/`recurring`/`wait`) is the library's own API — see
[Deterministic Timers](/guide/timers). This addon exists for the codebase that
already calls `setTimeout`/`setInterval`/`clearTimeout`/etc. directly and wants
to migrate onto a Time-Provider incrementally: swap the call site for
`timeProvider.compat.setTimeout(...)`, without rewriting it to the
`once`/`dispose()` shape first. Under the hood every method delegates straight
to `.scheduler`, so it follows the exact same [clock strategy](/guide/clock-strategies)
rules — real timers on a system clock, synchronous and in-line on
manual/sequential, never firing on a fixed clock.

## The methods

| Method                            | Delegates to                 | Cancelled by             |
| --------------------------------- | ---------------------------- | ------------------------ |
| `setTimeout(callback, delayMs?)`  | `scheduler.timers.once`      | `clearTimeout(handle)`   |
| `setInterval(callback, delayMs?)` | `scheduler.timers.every`     | `clearInterval(handle)`  |
| `queueMicrotask(callback)`        | `scheduler.microtasks.queue` | nothing — it always runs |

`delayMs` defaults to `0` when omitted or negative, matching `.scheduler`. Each
`clear*` method is a no-op if the handle's callback already ran or was already
cleared — it just calls `.dispose()` on the `IScheduledHandle` the matching
`set*` method returned.

There is deliberately no `setRecurring` here: nothing native ever had that
signature, so there is no call site to migrate. Self-rescheduling callbacks go
through [`scheduler.timers.recurring`](/api/scheduler).

## The performance members

`now()`, `timeOrigin`, `getEntries()`, `getEntriesByName()`, `getEntriesByType()`,
`mark()`, `measure()`, `clearMarks()` and `clearMeasures()` sit directly on
`.compat` too, with the same signatures as the `performance` global:

```ts
timeProvider.compat.mark("request-start");
// ...
timeProvider.compat.measure("request", "request-start");
console.log(timeProvider.compat.getEntriesByName("request")[0]?.duration);
```

They map onto the Time-Provider's own [`clock.monotonicNow()`](/api/clock),
`clock.monotonicOrigin` and [`timings`](/api/timings), so on a deterministic
Time-Provider they read that runtime's simulated timeline — the point being that
a file calling `performance.mark(...)` and `setTimeout(...)` side by side has one
object to swap them both for. On a system Time-Provider, the `getEntries*`
readers list the host's whole timeline, including entries it records itself
(`resource`, `navigation`...), as the `performance` global does.

## What other addons add here

Composing [`addon-animation-frame`](/addons/animation-frame) or
[`addon-idle`](/addons/idle) puts their own native-shaped aliases on this same
facade:

| Method                            | Added by                | Delegates to                        |
| --------------------------------- | ----------------------- | ----------------------------------- |
| `requestAnimationFrame(callback)` | `addon-animation-frame` | `scheduler.animation.scheduleFrame` |
| `cancelAnimationFrame(handle)`    | `addon-animation-frame` | `handle.dispose()`                  |
| `requestIdleCallback(callback)`   | `addon-idle`            | `scheduler.idle.request`            |
| `cancelIdleCallback(handle)`      | `addon-idle`            | `handle.dispose()`                  |

Each `cancel*` takes the handle its `request*` returned rather than a numeric
id, the same swap `clearTimeout` makes.

**Compose this addon first.** Those addons add to a facade this one owns, so it
has to exist by the time they are applied — `.use(compat).use(animation)`, not
the other way round. Composed the wrong way round the aliases are simply
absent, with no error. Their types say so: each declares its contribution as an
optional `compat?`, so TypeScript requires the addon that owns the facade to be
composed too before you can reach them without a check.

```ts
const tp = createTimeProvider.for(plugin).use(compat).use(animation).use(idle).create();

const frame = tp.compat.requestAnimationFrame(() => draw());
tp.compat.cancelAnimationFrame(frame);
```

## Naming the types

The `.compat` property is typed `ICompatApi`, and `WithCompatApi` names a
Time-Provider with this addon composed in:

```ts
import type { ICompatApi, WithCompatApi } from "@time-provider/addon-compat";

function pollUntilReady(compat: ICompatApi<Date>) {
  compat.setInterval(() => checkReady(), 1000);
}
function schedule(tp: ITimeProvider<Date> & WithCompatApi) {
  pollUntilReady(tp.compat);
}
```

`CompatRuntime` is also exported — the class implementing `.compat` on top of
`.scheduler.timers`. Composing the addon builds one for you; construct it
directly only if you need this facade outside the addon pipeline.
