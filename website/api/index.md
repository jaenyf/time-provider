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
interface IRuntimeBuilder {
  for<TDate>(adapter: IUtcOnlySystemPlugin<TDate>): IUtcOnlySystemPluggedRuntimeBuilder<TDate>;
  for<TDate>(adapter: ISystemPlugin<TDate>): ISystemPluggedRuntimeBuilder<TDate>;
}
```

Two overloads, not a union: the plugin you pass picks the builder you get, so
the timezone methods below are either there or they aren't. The deterministic
entry point's `createTimeProvider.for(...)` mirrors this exactly, taking an
`IDeterministicPlugin`/`IUtcOnlyDeterministicPlugin` instead.

`createTimeProvider` is a singleton instance of the exported `RuntimeBuilder`
class, which holds nothing but the `.for(...)` overloads above. You never need
to construct one — the singleton is stateless, and every option you set lives on
the builder `.for(...)` returns, so two call sites never interfere.

`IRuntimeBuilder`, `ISystemPluggedRuntimeBuilder` and
`IUtcOnlySystemPluggedRuntimeBuilder` are exported from
`@time-provider/core`, and `IDeterministicPluggedRuntimeBuilder` from
`@time-provider/core/deterministic`. The remaining builder interfaces — the
UTC-only deterministic one, and the per-strategy builders `.asFixed()`,
`.asManual()` and `.asSequential()` return — are internal; you never need to
name a half-built builder, and the finished provider type is what you'd
annotate anyway. See
[Naming these types](/api/clock#naming-these-types).

Starts a builder for the given plugin (adapter). Which methods are
available afterwards (`withTimezone`, `.create()` returning a
`localNow()`-capable clock, etc.) depends on whether the plugin
`supportsLocalTime`.

## From the system entry point (`@time-provider/core`)

Chainable off `.for(plugin)`:

- `.withTimezone(tz)` / `.withHostTimezone()` / `.withDefaultTimezone()` —
  only on a timezone-aware plugin's builder, see
  [Timezones & Local Time](/guide/timezones).
- `.use(addon)` — compose in an addon's extra facade, see [Addons](/addons/).
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
[IParser](/api/parser) · [ITimers](/api/timers) · [IPerformance](/api/performance)
