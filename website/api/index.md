# createTimeProvider

Two entry points, each exporting a `createTimeProvider` of the same shape —
pick the one matching what you're building. See
[Mental Model](/guide/mental-model) for why they're split.

```ts
import { createTimeProvider } from "@time-provider/core"; // system (real time) only
import { createTimeProvider } from "@time-provider/core/deterministic"; // fixed / manual / sequential
```

Each plugin mirrors the split: import its `plugin` from the package root for
the system entry point, or from its own `/deterministic` subpath for the
deterministic one. The two `plugin` objects are not interchangeable — a
system plugin only type-checks against the system `createTimeProvider`, and
likewise for deterministic.

## `.for(plugin)`

```ts
createTimeProvider.for<TDate>(
  plugin: ISystemPlugin<TDate> | IUtcOnlySystemPlugin<TDate>,
): ISystemPluggedRuntimeBuilder<TDate> | IUtcOnlySystemPluggedRuntimeBuilder<TDate>;
```

(On the deterministic entry point, the equivalent accepts an
`IDeterministicPlugin`/`IUtcOnlyDeterministicPlugin` and returns an
`IDeterministicPluggedRuntimeBuilder`/
`IUtcOnlyDeterministicPluggedRuntimeBuilder`.)

Starts a builder for the given plugin (adapter). Which methods are
available afterwards (`withTimezone`, `.create()` returning a
`localNow()`-capable clock, etc.) depends on whether the plugin
`supportsLocalTime`.

## From the system entry point (`@time-provider/core`)

Chainable off `.for(plugin)`:

- `.withTimezone(tz)` / `.withHostTimezone()` / `.withDefaultTimezone()` —
  only on a timezone-aware plugin's builder, see
  [Timezones & Local Time](/guide/timezones).
- `.use(addon)` — compose in an addon's extra facade, see [Addons](/guide/addons).
- `.create()` — builds and returns the `ITimeProvider<TDate>` (or
  `IUtcOnlyTimeProvider<TDate>`), backed by the real system clock and native
  timers. See [ITimeProvider](/api/time-provider).

## From the deterministic entry point (`@time-provider/core/deterministic`)

Chainable off `.for(plugin)`, in addition to `.withTimezone(...)` and
`.use(addon)` above:

| Call              | Returns a builder for…                                       |
| ----------------- | ------------------------------------------------------------ |
| `.asFixed()`      | fixed clock — then `.withFixedTime(t)`                       |
| `.asManual()`     | manual clock — then `.withInitialTime(t)`                    |
| `.asSequential()` | sequential clock — then one or more `.withSequentialTime(t)` |

Each of those, in turn, has its own `.create()` — see
[Clock Strategies](/guide/clock-strategies).

---

Next: [ITimeProvider](/api/time-provider) · [IClock](/api/clock) ·
[IParser](/api/parser) · [IScheduler](/api/scheduler) · [IPerformance](/api/performance)
