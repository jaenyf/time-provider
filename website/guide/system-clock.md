# System Clock

Built by `.create()` from `@time-provider/core` — the default, production
entry point. `clock.utcNow()` and `clock.localNow()` return the real current
time, and `timers` methods (`once`, `every`, `recurring`, `wait`) run on the real, native
timers.

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

const timeProvider = createTimeProvider.for(plugin).create();

timeProvider.clock.utcNow(); // real "now", as a Date
timeProvider.timers.once({ seconds: 1 }, () => console.log("fired")); // fires ~1s later, for real
```

This is what production code should be constructed with. Everywhere else in
the app, depend on `ITimeProvider<TDate>` rather than on this concrete
strategy, so tests can substitute [Fixed](/guide/fixed-clock),
[Manual](/guide/manual-clock), or [Sequential](/guide/sequential-clock)
instead — built from `@time-provider/core/deterministic`, see
[Mental Model](/guide/mental-model).
