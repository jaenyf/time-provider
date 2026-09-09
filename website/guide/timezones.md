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

## DST ambiguity

`localNow()`, `utcNow()`, and `parseToLocal()` never hit this: each starts
from an already-known instant and only renders it in local time, so there's
nothing to disambiguate. The ambiguity only exists the other way around —
turning local wall-clock fields into an instant — which today only happens
inside [`@time-provider/addon-cron`](/addons/cron), resolving a schedule's
local time back to when it actually fires.

That resolution is currently fixed, not something a caller can configure:

- A **skipped** local time (a spring-forward gap, e.g. 2:30 on the day
  clocks jump from 2:00 to 3:00) resolves to the first valid instant past
  the gap — e.g. in `Europe/Paris` on 2024-03-31, the transition skips
  02:30, which resolves to 03:30 CEST.
- A **repeated** local time (a fall-back overlap, e.g. 2:30 occurring
  twice) resolves to the earlier of the two occurrences — e.g. in
  `Europe/Paris` on 2024-10-27, 02:30 resolves to the first (CEST)
  occurrence, not the second (CET) one an hour later.

See [Timezones and DST](/addons/cron#timezones-and-dst) for worked examples.
Moment.js + moment-timezone is the one exception: it resolves both cases
through moment-timezone's own tzdata-driven logic rather than the algorithm
above, which currently happens to agree with it.

## UTC-only plugins

Native `Date` and plain Moment.js have no IANA-aware date type, so their
`IUtcOnlyTimeProvider` simply has no `localNow`, `withTimezone`, or
`hostTimezone` on `clock` — the methods don't exist on the type, rather than
throwing at runtime. If your code needs real local time, reach for
Day.js, Luxon, Moment.js + moment-timezone, or Temporal instead — see
[Plugins](/plugins/).
