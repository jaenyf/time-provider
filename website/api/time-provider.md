# ITimeProvider

```ts
interface ITimeProvider<TDate> {
  get clock(): IClock<TDate>;
  get parser(): IParser<TDate>;
  get timers(): ITimers;
  get performance(): IPerformance;
}

interface IUtcOnlyTimeProvider<TDate> {
  get clock(): IUtcOnlyClock<TDate>;
  get parser(): IUtcOnlyParser<TDate>;
  get timers(): ITimers;
  get performance(): IPerformance;
}
```

The object returned by `.create()`. All four getters return the _same_
underlying runtime instance, exposed through narrower interfaces — this is
why swapping strategies never changes call sites: whatever depends on
`ITimeProvider<TDate>` only ever sees `clock`, `parser`, `scheduler`, and
`performance`.

`IUtcOnlyTimeProvider` is what you get from a UTC-only plugin (native
`Date`, plain Moment.js) — same shape, but `clock`/`parser` only expose the
UTC-facing methods. See [Mental Model](/guide/mental-model) for why these
are two separate interfaces rather than one with optional members.

## IManualTimeProvider

```ts
interface IManualTimeProvider<TDate> extends ITimeProvider<TDate> {
  get clock(): IManualClock<TDate>;
}

interface IUtcOnlyManualTimeProvider<TDate> extends IUtcOnlyTimeProvider<TDate> {
  get clock(): IUtcOnlyManualClock<TDate>;
}
```

What `.asManual()....create()` (from `@time-provider/core/deterministic`)
returns — identical to `ITimeProvider`/`IUtcOnlyTimeProvider` except `clock`
is additionally `IAdvanceable`, i.e. has `.advance(options)`. Which of the
two you get follows the plugin, exactly as above: `IManualTimeProvider` from
a timezone-aware plugin, `IUtcOnlyManualTimeProvider` from a UTC-only one.
See [Manual Clock](/guide/manual-clock).

Both are exported from `@time-provider/core/deterministic`, and they are the
entry point for naming anything below them —
`IManualTimeProvider<TDate>["clock"]` and so on. See
[Naming these types](/api/clock#naming-these-types).

Of the clock types referenced above, only `IClock` is exported.
`IUtcOnlyClock`, `IManualClock`, `IUtcOnlyManualClock` and `IAdvanceable` are
documented in [IClock](/api/clock) because they are part of the public API
surface — the shape of what `.create()` hands you — not because you can import
them. [IParser](/api/parser) notes the same about `ILocalOnlyParser`.

## Composing with an addon

`.use(addon)` on the builder, before `.create()`, widens the resulting
Time-Provider with the addon's own extra property (e.g. `.animation` from
`@time-provider/addon-animation-frame`) — `clock`, `parser`, `scheduler`,
and `performance` are always present regardless of which addons are
composed in. See [Addons](/addons/).
