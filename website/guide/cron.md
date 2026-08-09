# Cron Schedules

`@time-provider/addon-cron` adds a `.cron` facade that runs a callback on a
schedule described by a standard 5-field cron expression, evaluated in the
runtime's own local timezone. Like every [addon](/guide/addons), it composes in
with `.use(addon)` and ships two entry points — one for a system
Time-Provider, one for a deterministic one:

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-dayjs";
import { addon } from "@time-provider/addon-cron";

const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .withTimezone("Europe/Paris")
  .create();

const handle = timeProvider.cron.schedule("0 9 * * MON-FRI", () => console.log("Good morning!"));

timeProvider.cron.unschedule(handle);
```

`withTimezone(...)` needs a timezone-aware plugin, hence `plugin-dayjs` above
rather than `plugin-native`. On a UTC-only plugin the schedule still works,
it just reads in `"Etc/UTC"` — see
[Timezones & Local Time](/guide/timezones).

On a deterministic Time-Provider the schedule runs against that runtime's own
simulated clock, so a whole week of a job's behaviour is a single `advance()`
away — no real waiting, no flaky timing:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-cron/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .asManual()
  .withInitialTime("2024-01-01T00:00:00.000Z")
  .create();

let runs = 0;
timeProvider.cron.schedule("*/15 * * * *", () => runs++);

timeProvider.clock.advance({ hours: 1 });
console.log(runs); // 4
```

## Expression syntax

The five fields are `minute hour day-of-month month day-of-week`. Each accepts
`*`, a single value, an `a-b` range, a `.../n` step, or a comma-separated list
mixing any of those:

| Expression        | Meaning                                  |
| ----------------- | ---------------------------------------- |
| `* * * * *`       | every minute                             |
| `0 9 * * MON-FRI` | 09:00 on weekdays                        |
| `*/15 8-18 * * *` | every 15 minutes between 08:00 and 18:59 |
| `0 0 1 JAN,JUL *` | midnight on 1 January and 1 July         |
| `30 2 * * 7`      | 02:30 on Sundays (`7` is a Sunday alias) |

Month and day-of-week also accept names (`JAN`–`DEC`, `SUN`–`SAT`),
case-insensitively.

Two behaviours worth knowing, both inherited from POSIX cron:

- When **both** `day-of-month` and `day-of-week` are restricted, a match on
  _either_ counts — `0 0 1,15 * MON` fires on the 1st, the 15th, _and_ every
  Monday.
- Seconds are not a field, and the `L`/`W`/`#` extensions some cron
  implementations add are not supported.

A malformed expression throws from `schedule()` itself, before anything is
scheduled, so a typo surfaces at the call site rather than at 3 a.m.

## JSON schedules

`schedule()` also accepts an `ICronSpec` object, for callers who would rather
not write the positional syntax. Omitted fields mean "every value":

```ts
timeProvider.cron.schedule({ hour: 9, dayOfWeek: ["MON", "WED", "FRI"] }, () =>
  console.log("Good morning!"),
);

timeProvider.cron.schedule({ minute: { from: 0, to: 45, step: 15 } }, () =>
  console.log("Every 15 minutes"),
);
```

`month` and `dayOfWeek` only accept their own names, so passing a day-of-week
name to `hour` — or a month name to `dayOfWeek` — is a compile-time error, not
a runtime surprise. `cronExpressionToSpec` converts an existing expression
string into this form.

### Spec field types

Every `ICronSpec` field is optional and defaults to `"*"`. Each accepts a
single value, a `{ from, to, step? }` range, or an array mixing both — and
anywhere a number is accepted, a `NumericString` like `"9"` works identically:

| Field                          | Type                     | Range type               |
| ------------------------------ | ------------------------ | ------------------------ |
| `minute`, `hour`, `dayOfMonth` | `CronNumericFieldSpec`   | `CronNumericRangeSpec`   |
| `month`                        | `CronMonthFieldSpec`     | `CronMonthRangeSpec`     |
| `dayOfWeek`                    | `CronDayOfWeekFieldSpec` | `CronDayOfWeekRangeSpec` |

The month and day-of-week variants differ from the numeric one only in also
accepting their own names — `MonthName` (`"JAN"`–`"DEC"`) and `DayOfWeekName`
(`"SUN"`–`"SAT"`) for the default Gregorian calendar. That's what makes the
field/name mismatch a compile-time error: the name types are separate, so
`{ hour: "MON" }` doesn't type-check.

```ts
import type { CronNumericFieldSpec, ICronSpec, MonthName } from "@time-provider/addon-cron";

const everyQuarterHour: CronNumericFieldSpec = { from: 0, to: 45, step: 15 };
const summer: MonthName[] = ["JUN", "JUL", "AUG"];
const spec: ICronSpec = { minute: everyQuarterHour, month: summer };
```

Both name types come from the runtime's calendar, so a plugin backed by a
different calendar system substitutes its own — see
[Which calendar?](#which-calendar) below.

## Parsing without scheduling

Three functions back `.cron` and are exported for use on their own — validating
a user-supplied expression at config-load time, say, or computing an occurrence
without registering a callback:

```ts
import {
  computeNextOccurrence,
  cronExpressionToSpec,
  parseCronExpression,
  parseCronSpec,
} from "@time-provider/addon-cron";

const adapter = timeProvider.clock.calendarAdapter;

const parsed = parseCronExpression("0 9 * * MON-FRI", adapter);
const next = computeNextOccurrence(parsed, timeProvider.clock.utcNow(), "Europe/Paris", adapter);
```

- **`parseCronExpression(expression, adapter)`** — parses a 5-field expression
  into a `ParsedCronExpression`, which holds one resolved field per position.
  Throws unless there are exactly five whitespace-separated fields and each is
  well-formed and in range for the calendar.
- **`parseCronSpec(spec, adapter)`** — the same, for the `ICronSpec` object
  form.
- **`cronExpressionToSpec(expression, adapter)`** — converts an expression
  string into an `ICronSpec`.
- **`computeNextOccurrence(parsed, from, timezone, adapter)`** — the next
  `TDate` strictly after `from` at which `parsed` matches, read in `timezone`.
  Resolves DST exactly as a schedule does: the first instant after a
  spring-forward gap, the earlier of the two on a fall-back overlap. Throws if
  no match exists within a ten-year search bound, which is how an impossible
  expression like `"0 0 31 2 *"` fails fast instead of spinning.

Every one of them takes the runtime's calendar adapter, reachable as
`timeProvider.clock.calendarAdapter`, so they resolve field ranges and names
against whatever calendar backs your plugin.

`CronScheduler` is also exported — the class implementing `.cron` on top of
`IScheduler.setRecurring`, re-deriving the delay to the next occurrence after
every run. Composing the addon builds one for you; construct it directly only
if you need a cron facade outside the addon pipeline, passing it the scheduler,
a `timestampNow` reader, a timezone reader, and a calendar adapter.

The `.cron` property itself is typed `ICronApi`, and `WithCronApi` names a
Time-Provider with this addon composed in:

```ts
import type { ICronApi, WithCronApi } from "@time-provider/addon-cron";

function everyMorning(cron: ICronApi) {
  cron.schedule("0 9 * * *", () => {});
}
function schedule(tp: ITimeProvider<Date> & WithCronApi) {
  everyMorning(tp.cron);
}
```

## Timezones and DST

Schedules are read in the runtime's local timezone, so `"0 9 * * *"` means
09:00 _there_, not 09:00 UTC. A schedule captures the clock's timezone when
`schedule()` is called and keeps it for its whole life — calling
`clock.withTimezone(...)` afterwards retargets schedules created from then on,
and leaves running ones where they were.

Daylight-saving transitions make some wall-clock times ambiguous or
non-existent, and both cases resolve deterministically:

- **Spring forward** — `"30 2 * * *"` on a day when 02:00–03:00 never happens
  runs at 03:30, the first valid instant past the gap.
- **Fall back** — when 02:30 happens twice, the schedule runs at the _first_
  of the two, not both.

## Callbacks that throw

A cron callback is an ordinary scheduler callback, so a throwing one follows
the [scheduler's](/guide/scheduler) usual rule: the exception propagates in a
Node-like environment and is logged in a browser-like one. Either way the
schedule stops, exactly as a `setRecurring` callback that throws does.

If a failing run should not end the job, catch inside your own callback:

```ts
timeProvider.cron.schedule("0 * * * *", () => {
  try {
    doHourlyWork();
  } catch (error) {
    reportToMonitoring(error);
  }
});
```

## Which calendar?

Cron asks the runtime's plugin what its calendar looks like — how many months
a year has, how long a week is, what the months are called — rather than
assuming the Gregorian answers. Every plugin shipped today is Gregorian, so
this is invisible in normal use; it matters if you write a
[custom plugin](/plugins/custom) backed by a different calendar system, where
your own field ranges and month names apply automatically.
