# Timezones & Local Time

Not every date library can represent an arbitrary IANA timezone. `time-provider`
splits plugins into two kinds along that line:

| Kind     | `localNow()` / `withTimezone()` / `hostTimezone()` | Plugins                                              |
| -------- | -------------------------------------------------- | ---------------------------------------------------- |
| Full     | available                                          | Day.js, Luxon, Moment.js + moment-timezone, Temporal |
| UTC-only | not on the type                                    | native `Date`, plain Moment.js                       |

For a "full" plugin, set the local timezone at build time — `.withTimezone(...)`
works the same way on the system entry point (`@time-provider/core`) and the
deterministic one (`@time-provider/core/deterministic`):

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-dayjs";

const timeProvider = createTimeProvider.for(plugin).withTimezone("America/New_York").create();

timeProvider.clock.utcNow(); // instant, in UTC
timeProvider.clock.localNow(); // same instant, rendered in America/New_York
```

Or change it on the already-built clock:

```ts
timeProvider.clock.withTimezone("Asia/Tokyo");
timeProvider.clock.hostTimezone(); // the machine's own IANA timezone
timeProvider.clock.timezone; // the currently configured local timezone
```

Three builder methods compose a timezone before `.create()`:

- `withTimezone(tz)` — an explicit IANA zone, e.g. `"Europe/Paris"`.
- `withHostTimezone()` — whatever timezone the current host is in.
- `withDefaultTimezone()` — discards any custom zone, back to `"Etc/UTC"`.

If no local timezone is ever specified, the runtime assumes `"Etc/UTC"` —
it never silently guesses the host's timezone for you.

## UTC-only plugins

Native `Date` and plain Moment.js have no IANA-aware date type, so their
`IUtcOnlyTimeProvider` simply has no `localNow`, `withTimezone`, or
`hostTimezone` on `clock` — the methods don't exist on the type, rather than
throwing at runtime. If your code needs real local time, reach for
Day.js, Luxon, Moment.js + moment-timezone, or Temporal instead — see
[Plugins](/plugins/).
