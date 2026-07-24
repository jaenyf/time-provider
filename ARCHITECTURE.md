# Architecture

This document orients contributors to how `time-provider` turns a plugin (an
adapter for a date library) into an `ITimeProvider`. For the public API and
the motivation behind it, see the [README](./README.md).

## Packages

The library is a monorepo split into one core package and one adapter
("plugin") package per supported date library:

```
packages/
  core/                    @time-provider/core         - abstractions, base classes, the builder
  plugin-native/           @time-provider/plugin-native - native Date (UTC-only)
  plugin-dayjs/            @time-provider/plugin-dayjs  - Day.js
  plugin-luxon/            @time-provider/plugin-luxon  - Luxon
  plugin-moment/           @time-provider/plugin-moment - Moment.js (UTC-only)
  plugin-moment-timezone/  @time-provider/plugin-moment-timezone - Moment.js + moment-timezone
  plugin-temporal/         @time-provider/plugin-temporal - Temporal (@js-temporal/polyfill)
  test-shared/             behavior specs shared by every plugin's test suite
  test/                    per-plugin test entry points, each running the shared specs
  test-e2e/                one smoke test per plugin against its built dist output
  test-treeshake/          per-plugin bundle assertions - see "Tree-shaking" below
```

`core` has no runtime dependencies. Each plugin depends only on `core` and
its own date library.

## File layout

Both `core` and every plugin package split their `src/` into exactly two
kinds of file, and no more than that:

- **`index.ts` / `deterministic.ts`** - the two public entry points (see
  "Tree-shaking" below). Thin: a handful of re-exports plus, for a plugin,
  the date-library setup (e.g. `dayjs.extend(...)`) and the exported
  `plugin` const.
- Everything else is grouped by what it actually _is_, not by how many
  interfaces or classes happen to be in it:
  - `types.ts` (core) holds every pure `interface`/`type` declaration -
    `IClock`, `IRuntime`, `IPlugin`, the builder contracts, all of it. A
    TypeScript type is erased entirely at compile time, so which file it's
    declared in has zero effect on a bundle: one interface per file adds
    navigation overhead without buying anything, so core keeps them in one
    place instead. `creators.ts` holds the builder/fluent-API contracts
    specifically (`ITimeProviderCreator` and friends) - kept apart from
    `types.ts` only because it was already a single cohesive file before
    this reorganization and splitting it further wouldn't help readability.
  - Runtime code (classes) is split by which entry point actually needs it,
    because _that_ split is the one that matters for tree-shaking:
    `runtime-base.ts` / `builder-base.ts` hold what both entry points share;
    `system-*.ts` files hold what only `index.ts` reaches; `deterministic-*.ts`
    files hold what only `deterministic.ts` reaches. A plugin follows the
    same split: `runtime-helper.ts` (the shared `RuntimeHelper`), `system.ts`
    (`SystemPlugin` + `SystemRuntime`), `deterministic-runtimes.ts`
    (`DeterministicPlugin` + `Fixed`/`Manual`/`SequentialRuntime`).

## Pipeline

```
Plugin (adapter)
  -> TimeProviderCreator.for(plugin)   (core/src/builders/system-builder.ts,
                                         core/src/builders/deterministic-builder.ts)
  -> a PluggedTimeProviderCreator
  -> .create() / .asFixed() / .asManual() / .asSequential()
  -> a Runtime (plugin's system.ts/deterministic-runtimes.ts, extending a
     core Base* class from system-runtime.ts/deterministic-runtime.ts)
  -> ITimeProvider { clock, parser, scheduler }  (core/src/runtimes/runtime-base.ts)
```

A `Runtime` is a single object that implements `IClock`, `IParser`, and
`IScheduler` at once (`BaseRuntime.clock`/`.parser`/`.scheduler` all return
`this`); `ITimeProvider` just exposes those three facets as separate
properties. The four runtime kinds (system, fixed, manual, sequential) share
this shape and differ only in where `timestamp()` comes from and, for
manual, how it advances.

## How we avoid duplication in plugins codebase

Every plugin needs the same three conversions between its date library's
value and time-provider's internal representation: to a timestamp, to a UTC
value, to a local value for a given timezone.

In order to share this behavior, `core/src/types/types.ts` declares that shape once, as `ITimeConverter`:

```typescript
interface ITimeConverter<TDate> {
  convertToTimestamp(time: string | number | TDate): number;
  convertToUtcDate(time: string | number | TDate): TDate;
  convertToLocalDate(timezone: TimezoneDefinition, time: string | number | TDate): TDate;
}
```

`BaseRuntime` takes an `ITimeConverter<TDate>` in its constructor and
implements the three conversion hooks by delegating to it. Each plugin
writes the conversions exactly once, as a `RuntimeHelper` class (in its own
`runtime-helper.ts`) whose static methods happen to match `ITimeConverter`'s
shape - a class value structurally satisfies the interface via its static
side, so no wrapping is needed. Each of the plugin's four runtime classes
(`SystemRuntime` in `system.ts`; `FixedRuntime`/`ManualRuntime`/
`SequentialRuntime` in `deterministic-runtimes.ts`) then does nothing but
forward its own constructor arguments plus `RuntimeHelper` into the matching
`Base*Runtime` constructor:

```typescript
export class FixedRuntime extends BaseFixedRuntime<Date> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | Date) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}
```

## Why "full" and "UTC-only" plugins are two separate interface hierarchies

Not every date library can represent an arbitrary IANA timezone. Native
`Date` and plain `Moment.js` cannot; Day.js, Luxon, Moment.js +
moment-timezone, and Temporal can. `time-provider` reflects this with two
parallel hierarchies (`IPlugin`/`IRuntime`/`IClock` vs. `IUtcOnlyPlugin`/
`IUtcOnlyRuntime`/`IUtcOnlyClock`) rather than one interface with an optional
or runtime-checked `localNow()`.

This is deliberate.  
The two hierarchies must stay separate rather than being merged behind a single `IRuntime<TDate>`
with an optional method:

- **It's a real, user-facing arity difference.** A "full" plugin's
  `createSystemRuntime(localTimezone)` requires a timezone argument; a
  UTC-only plugin's `createSystemRuntime()` takes none. Collapsing the two
  into one signature would force one side to accept a parameter it can't
  honor or silently ignore one it needs.
- **The two are not distinguishable by a boolean check that TypeScript can
  narrow.** `IPlugin<TDate>` structurally satisfies `IUtcOnlyPlugin<TDate>`
  (a "full" plugin has every member a "UTC-only" one needs, plus more), so a
  conditional type or overload keyed only on the union of the two, without
  narrowing through the `supportsLocalTime` discriminant property first,
  resolves to the narrower branch for _both_ kinds - silently. Each `Plugin`
  therefore declares `readonly supportsLocalTime: true` or `readonly
supportsLocalTime: false` as a literal-typed discriminant, and any code
  that needs to treat the two differently must narrow on it explicitly
  (`plugin.supportsLocalTime ? ... : ...`), even when, as in
  `TimeProviderCreator.for()`, both branches happen to call the same
  underlying expression - the branching still exists to make the _type_
  resolve correctly, not for the runtime value.

A UTC-only plugin's `Runtime` still has to satisfy `BaseRuntime`'s abstract
`localNow()`, because `BaseRuntime` is shared by both hierarchies; it does so
with an implementation that throws, which is correct (nothing reachable
through the plugin's public `IUtcOnlyRuntime`-typed surface can call it) but
also means that method is intentionally never exercised by the test suite.
If you're looking at coverage and wondering why `plugin-native` and
`plugin-moment` aren't at 100%, this is why.

## Tree-shaking

`index.ts` (the production, system (real-time) entry) and
`deterministic.ts` (the deterministic entry, intended to be used in deterministic environments (tests))
are the _only_ boundary that matter for bundle size.

Every package is tested to be tree-shakable by `packages/test-treeshake` which checks against each of them, for every runtime, and asserts two things per plugin:

- A system-only consumer's bundle (`fixtures/system-only/<plugin>.ts`,
  built against `index.ts`) contains none of deterministic code markers.
- A deterministic consumer's bundle (`fixtures/deterministic/<plugin>.ts`, built against `deterministic.ts`,
  using `.asFixed()`/`.asManual()`/`.asSequential()`) contains every one of
  those same markers.

Those checks also ensure the core package itself is correctly tree-shaked.

## Scheduling

`BaseDeterministicRuntime` (`core/src/runtimes/deterministic-runtime.ts`, not
re-exported - only `BaseFixedRuntime`/`BaseManualRuntime`/
`BaseSequentialRuntime` are part of the public `deterministic.ts` surface)
backs the fixed, manual, and sequential runtimes. `setTimeout`/`setInterval`
insert into a `Map` and then check only the just-inserted handle for
firing immediately (a zero or negative delay fires synchronously on
registration) - not the whole pending set, since nothing already pending can
have newly become due from an insert alone. Advancing time (via `advance()`
on the manual runtime, or moving through a fixed/sequential runtime's
timestamps) does scan the full pending set, since any number of entries may
have become due at once. A repeating interval whose delay is smaller than
the elapsed advance re-fires as many times as would fit, matching how a real
interval behaves when the event loop was blocked past a firing.

## Testing

- `packages/test-shared` defines the behavior every plugin must satisfy as
  parameterized spec functions (`testSystemRuntime`, `testFixedRuntime`,
  `testManualRuntime`, `testSequentialRuntime`, `testTimeProvider`,
  `testTimeProviderCreator`, ...), gating the local-time-specific assertions
  behind `describe.skipIf(!plugin.supportsLocalTime)` so the same suite runs
  against both kinds of plugin without duplicating it.
- `packages/test` has one file per plugin (`packages/test/src/plugin-*/all.test.ts`)
  that imports the built plugin and hands it to `testAll` from
  `test-shared`.
- `packages/test-e2e` has one smoke test per plugin, run against the built
  `dist` output rather than source, to catch packaging/export mistakes that
  a source-level test wouldn't.

Coverage (`vp test --coverage`) is enforced in CI; see the `build-test` job
in [`.github/workflows/check.yml`](.github/workflows/check.yml).
