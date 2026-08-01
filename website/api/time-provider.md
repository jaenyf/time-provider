# ITimeProvider

```ts
interface ITimeProvider<TDate> {
  get clock(): IClock<TDate>;
  get parser(): IParser<TDate>;
  get scheduler(): IScheduler;
  get performance(): IPerformance;
}

interface IUtcOnlyTimeProvider<TDate> {
  get clock(): IUtcOnlyClock<TDate>;
  get parser(): IUtcOnlyParser<TDate>;
  get scheduler(): IScheduler;
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
```

What `.asManual()....create()` (from `@time-provider/core/deterministic`)
returns — identical to `ITimeProvider` except `clock` is additionally
`IAdvanceable`, i.e. has `.advance(options)`. See
[Manual Clock](/guide/manual-clock).

## Composing with an addon

`.use(addon)` on the builder, before `.create()`, widens the resulting
Time-Provider with the addon's own extra property (e.g. `.animation` from
`@time-provider/addon-animation-frame`) — `clock`, `parser`, `scheduler`,
and `performance` are always present regardless of which addons are
composed in. See [Addons](/guide/addons).
