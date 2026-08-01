# Quick Start

## Production

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

const timeProvider = createTimeProvider.for(plugin).create();

class UserService {
  constructor(private readonly timeProvider: ITimeProvider<Date>) {}

  createUser() {
    return { createdAt: this.timeProvider.clock.utcNow() };
  }
}
```

`createTimeProvider.for(plugin).create()` builds a **system** clock — real
time, real timers, exactly like calling `new Date()` and `setTimeout`
directly, just wrapped behind the `ITimeProvider` interface.

## Tests

Deterministic strategies live behind a separate entry point,
`@time-provider/core/deterministic`, and require the plugin's own
`/deterministic` subpath — see [Mental Model](/guide/mental-model) for why.
Swap in `.asManual()...create()` (or `.asFixed()`, `.asSequential()`) —
`UserService` itself never changes, it still just receives an
`ITimeProvider`:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00:00.000Z")
  .create();

let retries = 0;
timeProvider.scheduler.setInterval(() => retries++, 1000);
timeProvider.clock.advance({ seconds: 3 });

expect(retries).toBe(3);
```

Manual and sequential clocks run synchronously: a due `setTimeout`/
`setInterval` callback fires in-line, as a direct side effect of the call
that made it due (`advance()`, `localNow()`, `utcNow()`) — not on a real
event-loop tick. No `await`, no fake-timer install/restore boilerplate.

## Try it live

The [Playground](/playground) lets you pick a plugin and a clock strategy,
read `localNow()`/`utcNow()`, register timers, and advance time — without
installing anything.
