# IConverter

```ts
interface IUtcOnlyConverter<TDate> {
  convertToUtc(time: string | number | TDate): TDate;
}

interface ILocalOnlyConverter<TDate> {
  convertToLocal(time: string | number | TDate): TDate;
}

interface IConverter<TDate> extends IUtcOnlyConverter<TDate>, ILocalOnlyConverter<TDate> {}
```

`IConverter` and `IUtcOnlyConverter` are both exported from `@time-provider/core` —
which one your `timeProvider.converter` is follows the plugin, exactly as for
[IClock](/api/clock). `ILocalOnlyConverter` is **not exported**; it appears here
because it is part of the public API surface — the local half of what
`timeProvider.converter` offers on a timezone-aware plugin, and a name tooltips
will show you — not because you can import it.

Both methods accept an ISO 8601 time string, an epoch-milliseconds number,
or an already-converted `TDate` — other string formats (e.g. RFC 2822, or a
date library's own non-ISO `toString()` output) aren't supported and may
throw or produce an unspecified result depending on the underlying date
library.

- **`convertToUtc(time)`** — converts `time` into a `TDate` expressed in UTC.
  Always available.
- **`convertToLocal(time)`** — converts `time` into a `TDate` expressed in the
  clock's configured local timezone. Only on timezone-aware plugins
  (`IConverter`, not `IUtcOnlyConverter`) — see
  [Timezones & Local Time](/guide/timezones).

```ts
timeProvider.converter.convertToUtc("2026-06-01T12:00:00Z");
timeProvider.converter.convertToUtc(1780488000000);
timeProvider.converter.convertToLocal("2026-06-01T12:00:00Z"); // rendered in clock.timezone
```
