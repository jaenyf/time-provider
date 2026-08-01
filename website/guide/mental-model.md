# Mental Model

`time-provider` turns a plugin (an adapter for a date library) into an
`ITimeProvider` through one pipeline:

```
Plugin (adapter)
  -> createTimeProvider.for(plugin)     a PluggedRuntimeBuilder
  -> .create() / .asFixed() / .asManual() / .asSequential()
  -> a Runtime
  -> ITimeProvider { clock, parser, scheduler, performance }
```

A `Runtime` is a single object that implements `IClock`, `IParser`, and
`IScheduler` at once — `ITimeProvider.clock`/`.parser`/`.scheduler` all
return that same instance wearing three different interface hats. The four
runtime kinds (system, fixed, manual, sequential) share this shape and
differ only in where the current timestamp comes from and, for manual, how
it advances.

## Two entry points, on purpose

`.create()` alone only ever builds a **system** (real time) runtime. Fixed,
manual, and sequential runtimes live behind a separate entry point instead
of extra methods on the same builder:

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

createTimeProvider.for(plugin).create(); // system only - no .asFixed()/.asManual()/.asSequential() here

// tests
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

createTimeProvider.for(plugin).asManual().withInitialTime(0).create();
```

Both `createTimeProvider`s share the same name and shape (`.for(plugin)`,
`.withTimezone(...)`, `.use(addon)`, ...) but come from different modules,
and each plugin exports a **different `plugin` object** per entry point
(`ISystemPlugin`/`IUtcOnlySystemPlugin` from the default export vs.
`IDeterministicPlugin`/`IUtcOnlyDeterministicPlugin` from `/deterministic`) —
mixing them (e.g. passing a `/deterministic` plugin to the system
`createTimeProvider`) is a type error. This is deliberate: a production
bundle that only ever imports `@time-provider/core` and
`@time-provider/plugin-native` never pulls in the fixed/manual/sequential
runtime code at all, since bundlers can tree-shake an entry point that's
never imported. See the package's own
[ARCHITECTURE.md](https://github.com/jaenyf/time-provider/blob/main/ARCHITECTURE.md#tree-shaking)
for how this is verified in CI.

## Two plugin hierarchies, on purpose

Not every date library can represent an arbitrary IANA timezone: native
`Date` and plain Moment.js cannot; Day.js, Luxon, Moment.js +
moment-timezone, and Temporal can. Rather than one interface with an
optional or runtime-checked `localNow()`, time-provider keeps two parallel
hierarchies per entry point — `ISystemPlugin`/`IRuntime`/`IClock` (or
`IDeterministicPlugin` on the deterministic side) for "full"
(timezone-aware) plugins, and `IUtcOnlySystemPlugin`/`IUtcOnlyRuntime`/
`IUtcOnlyClock` (or `IUtcOnlyDeterministicPlugin`) for UTC-only ones.

This is a real, user-facing arity difference (a full plugin's
`createSystemRuntime(localTimezone)` requires a timezone argument a
UTC-only plugin's equivalent doesn't take), and it isn't reliably
distinguishable by a boolean check TypeScript can narrow through — so each
plugin declares a literal-typed `readonly supportsLocalTime: true | false`
discriminant instead.

In practice this means: a UTC-only plugin's `ITimeProvider` simply has no
`localNow()`, `withTimezone()`, or `hostTimezone()` on its clock — those
methods don't exist on the type, rather than throwing at runtime. See
[Timezones & Local Time](/guide/timezones) for which plugins support which.

## Addons extend the runtime, plugins don't

`.use(addon)`, available on either entry point's builder before `.create()`
(or before picking a deterministic strategy), extends the resulting
Time-Provider with an extra property beyond `clock`/`parser`/`scheduler`/
`performance` — e.g. `.animation` from
[`@time-provider/addon-animation-frame`](/guide/addons). A plugin only ever
bridges a date library in; an addon adds new surface area to what
`.create()` returns.

Further reading: the repository's
[ARCHITECTURE.md](https://github.com/jaenyf/time-provider/blob/main/ARCHITECTURE.md)
goes deeper into the runtime/converter plumbing shared across plugins.
