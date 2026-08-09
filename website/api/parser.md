# IParser

```ts
interface IUtcOnlyParser<TDate> {
  parseToUtc(time: string | number | TDate): TDate;
}

interface ILocalOnlyParser<TDate> {
  parseToLocal(time: string | number | TDate): TDate;
}

interface IParser<TDate> extends IUtcOnlyParser<TDate>, ILocalOnlyParser<TDate> {}
```

`IParser` and `IUtcOnlyParser` are both exported from `@time-provider/core` —
which one your `timeProvider.parser` is follows the plugin, exactly as for
[IClock](/api/clock). `ILocalOnlyParser` only describes how `IParser` is
composed and is not exported.

Both methods accept an ISO 8601 time string, an epoch-milliseconds number,
or an already-parsed `TDate` — other string formats (e.g. RFC 2822, or a
date library's own non-ISO `toString()` output) aren't supported and may
throw or produce an unspecified result depending on the underlying date
library.

- **`parseToUtc(time)`** — parses `time` into a `TDate` expressed in UTC.
  Always available.
- **`parseToLocal(time)`** — parses `time` into a `TDate` expressed in the
  clock's configured local timezone. Only on timezone-aware plugins
  (`IParser`, not `IUtcOnlyParser`) — see
  [Timezones & Local Time](/guide/timezones).

```ts
timeProvider.parser.parseToUtc("2026-06-01T12:00:00Z");
timeProvider.parser.parseToUtc(1780488000000);
timeProvider.parser.parseToLocal("2026-06-01T12:00:00Z"); // rendered in clock.timezone
```
