# Compatibility Layer

[`@time-provider/addon-compat`](https://www.npmjs.com/package/@time-provider/addon-compat)
adds a `.compat` facade exposing native-style `setTimeout`/`setInterval`/`setRecurring`
call signatures on top of a Time-Provider's own timers. Like every
[addon](/addons/) it composes in with `.use(addon)` and ships two entry
points — one for a system Time-Provider, one for a deterministic one:

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-compat";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

const handle = timeProvider.compat.timers.setTimeout(() => console.log("tick"), 500);
timeProvider.compat.timers.clearTimeout(handle);
```

On a deterministic Time-Provider the same calls run against that runtime's own
simulated clock, so code written against this facade is testable the same way
as code written against `.timers`:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-compat/deterministic";

const manual = createTimeProvider.for(plugin).use(addon).asManual().withInitialTime(0).create();

let ticks = 0;
manual.compat.timers.setInterval(() => ticks++, 1000);
manual.clock.advance({ seconds: 3 });
console.log(ticks); // 3
```

## Why this facade exists

`.timers` (`once`/`every`/`recurring`/`wait`) is the library's own API — see
[Deterministic Timers](/guide/timers). This addon exists for the codebase that
already calls `setTimeout`/`setInterval`/`clearTimeout`/etc. directly and wants
to migrate onto a Time-Provider incrementally: swap the call site for
`timeProvider.compat.timers.setTimeout(...)`, without rewriting it to the
`once`/`dispose()` shape first. Under the hood every method delegates straight
to `.timers`, so it follows the exact same [clock strategy](/guide/clock-strategies)
rules — real timers on a system clock, synchronous and in-line on
manual/sequential, never firing on a fixed clock.

## The methods

| Method                                    | Delegates to       | Cancelled by             |
| ----------------------------------------- | ------------------ | ------------------------ |
| `setTimeout(callback, delayMs?)`          | `timers.once`      | `clearTimeout(handle)`   |
| `setInterval(callback, delayMs?)`         | `timers.every`     | `clearInterval(handle)`  |
| `setRecurring(callback, initialDelayMs?)` | `timers.recurring` | `clearRecurring(handle)` |

`delayMs`/`initialDelayMs` default to `0` when omitted or negative, matching
`.timers`. Each `clear*` method is a no-op if the handle's callback already
ran or was already cleared — it just calls `.dispose()` on the
`IScheduledHandle` the matching `set*` method returned.

## Naming the types

The `.compat` property is typed `ICompatApi`, and `WithCompatApi` names a
Time-Provider with this addon composed in:

```ts
import type { ICompatApi, WithCompatApi } from "@time-provider/addon-compat";

function pollUntilReady(compat: ICompatApi<Date>) {
  compat.timers.setInterval(() => checkReady(), 1000);
}
function schedule(tp: ITimeProvider<Date> & WithCompatApi) {
  pollUntilReady(tp.compat);
}
```

`CompatRuntime` is also exported — the class implementing `.compat` on top of
`ITimers`. Composing the addon builds one for you; construct it directly only
if you need this facade outside the addon pipeline.
