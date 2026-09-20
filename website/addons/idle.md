# Idle Callbacks

[`@time-provider/addon-idle`](https://www.npmjs.com/package/@time-provider/addon-idle)
adds a `scheduler.idle` facade exposing `request`, backed by the host's native
`requestIdleCallback` on a system Time-Provider and by an explicit `drain()`
on a deterministic one. Like every [addon](/addons/) it composes in with
`.use(addon)` and ships two entry points:

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-idle";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

const handle = timeProvider.scheduler.idle.request(() => reindexSearchCache());
handle.dispose();
```

`request` matches the native `requestIdleCallback` contract: it fires
**once**, not repeatedly. Call it again from inside the callback to keep
polling for idle time. There is no separate cancel method, so cancel through
`handle.dispose()` as you would any other scheduled work in this library. It
is a no-op if the callback already ran or the handle was already disposed.
The handle is an `IScheduledHandle`, the same type every other
`@time-provider/core` timer returns.

## Idle on a deterministic clock

Nothing about elapsed simulated time says a runtime has spare capacity, so
there is no idle to detect. A deterministic request stays pending until a
test declares the runtime idle, and `advance()` or a clock read never fires
one on its own:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-idle/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .asManual()
  .withInitialTime(0)
  .create();

const ran: string[] = [];
timeProvider.scheduler.idle.request(() => ran.push("first"));
timeProvider.scheduler.idle.request(() => ran.push("second"));

timeProvider.clock.advance({ hours: 1 });
console.log(ran); // [] - moving the clock is not an idle period

timeProvider.scheduler.idle.drain(1); // returns 1
console.log(ran); // ["first"]

timeProvider.scheduler.idle.drain(); // returns 1, running everything still pending
console.log(ran); // ["first", "second"]
```

`drain(maxCount?)` runs up to `maxCount` pending callbacks, oldest request
first, and returns how many actually ran. Omit the argument to run everything
pending. That gives a test the thing a real host never offers: control over
how much work one idle period lets through, so you can assert what happens
when the host stays busy and only some of the queue drains.

Every deterministic runtime behaves the same way here. A fixed clock is no
exception, even though it disables the runtime's own due-draining, because
`drain()` retrieves this addon's entries through its own tagged index rather
than through anything the clock advances.

## Where the API isn't available

The system addon constructs eagerly and **throws** if the host has no
`requestIdleCallback`/`cancelIdleCallback`. Safari has no native equivalent,
and neither does Node.js, which exposes no such global. That surfaces at
`.create()`, not at the first request, so a host without the API fails while
you are building the Time-Provider rather than much later.

The deterministic addon never touches the host API, so it works everywhere.
Logic written against `scheduler.idle` stays testable on a runtime that could not run
it for real.

## The types

Inference covers ordinary use. If you need to write a type down, the root
entry point exports `IIdleApi` (the `scheduler.idle` facade) and `WithIdleApi` for
naming a Time-Provider with this addon composed in:

```ts
import type { IIdleApi, WithIdleApi } from "@time-provider/addon-idle";

function scheduleCleanup(tp: ITimeProvider<Date> & WithIdleApi) {
  tp.scheduler.idle.request(() => {});
}
```

The `/deterministic` entry point exports `IDeterministicIdleApi` and
`WithDeterministicIdleApi`, which extend those with `drain`. Reach for them
when a test helper takes a Time-Provider and needs to drain it.

The implementation classes are exported too, for the rare case of building a
facade outside the addon pipeline: `SystemIdleScheduler` from the root entry
point and `DeterministicIdleScheduler` from `/deterministic`.

## With the compat addon

Compose [`addon-compat`](/addons/compat) before this one and it also gets
`requestIdleCallback`/`cancelIdleCallback` on its facade, delegating to
`request` and to the handle's `dispose()`:

```ts
const tp = createTimeProvider.for(plugin).use(compat).use(addon).create();
tp.compat.cancelIdleCallback(tp.compat.requestIdleCallback(() => reconcile()));
```

`WithIdleApi` declares those as an optional `compat?`, since they are only there
when both addons are composed — and only when compat is composed first, because
the facade they land on is its.
