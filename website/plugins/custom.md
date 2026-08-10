# Writing a Custom Plugin

Every plugin needs the same three conversions between its date library's
value and time-provider's internal timestamp representation. `core`
declares that shape once, in `ITimeConverter<TDate>`:

```ts
interface ITimeConverter<TDate> {
  convertToTimestamp(time: string | number | TDate): number;
  convertToUtcDate(time: string | number | TDate): TDate;
  convertToLocalDate(timezone: TimezoneDefinition, time: string | number | TDate): TDate;
  readonly calendarScheme?: ICalendarScheme<TDate>;
}
```

`calendarScheme` is the one optional member. Declare it only to diverge from the
shared Gregorian/`Intl` default — to resolve wall-clock times against your date
library's own bundled timezone data, or to describe a non-Gregorian calendar —
and omit it to inherit that default. It's what
[cron schedules](/addons/cron) evaluate against, reachable on the runtime as
`calendarScheme`; ordinary consumers never see it, since it isn't on the
`ITimeProvider` facade.

`@time-provider/plugin-moment-timezone` is the worked example: it extends
`DefaultCalendarScheme` and overrides only `decompose`/`compose`, so cron
resolves against moment-timezone's bundled tzdata rather than the host's ICU.

### Writing a calendar scheme

`ICalendarScheme<TDate>` describes a calendar system: its unit sizes, the names
it gives months and weekdays, and how a `TDate` converts to and from wall-clock
fields. Its purpose is to act as an adapter between any plugin's date library internal calendar and any other consumer of a calendar-related arithmetic (e.g., the cron add-on that is actually calendar-agnostic).

```ts
interface ICalendarScheme<TDate, TMonthName extends string, TWeekdayName extends string> {
  toTimestamp(date: TDate): number;
  fromTimestamp(timestampMs: number): TDate;
  minutesPerHour(): number;
  hoursPerDay(): number;
  daysPerWeek(): number;
  monthsPerYear(): number;
  maxDayOfMonth(): number;
  readonly monthNames: readonly TMonthName[];
  readonly weekdayNames: readonly TWeekdayName[];
  normalize(fields: ComposableCalendarSchemeFields): CalendarSchemeFields;
  decompose(date: TDate, timezone: TimezoneDefinition): CalendarSchemeFields;
  compose(fields: ComposableCalendarSchemeFields, timezone: TimezoneDefinition): TDate;
}
```

The simplest way is to extend `DefaultCalendarScheme` and override only what differs.
It implements every member against the shared Gregorian/`Intl` behavior, so a plugin that
only disagrees about some field (e.g., timezone data) overrides only the concerned methods.

The unit sizes are queried rather than assumed, which is what lets a
non-Gregorian calendar work: `monthsPerYear()` and friends define the field
ranges [cron](/addons/cron) validates against, and `monthNames`/`weekdayNames`
supply the names it accepts. `TMonthName` and `TWeekdayName` default to
`DefaultCalendarSchemeMonthName` (`"JAN"`–`"DEC"`) and
`DefaultCalendarSchemeWeekdayName` (`"SUN"`–`"SAT"`), so the common case needs
no type arguments.

The three field-shaped members work in terms of two exported types:

- **`CalendarSchemeFields`** — `year`, `month`, `day`, `hour`, `minute` and
  `weekday`, all readonly. What `decompose` returns and `normalize` produces.
  `weekday` is derived by the calendar, not an independent input.
- **`ComposableCalendarSchemeFields`** — the same minus `weekday`, i.e.
  `Omit<CalendarSchemeFields, "weekday">`. What `compose` and `normalize`
  accept, since you don't get to choose a weekday.

`CalendarSchemeFieldsHelper` covers the two operations implementations keep
needing:

- **`toComposable(fields)`** — drops the derived `weekday`, turning a
  `CalendarSchemeFields` into a `ComposableCalendarSchemeFields`.
- **`equals(a, b)`** — compares two field bags over the composable subset, so a
  bogus `weekday` can't change the answer.

Three members carry rules worth honouring precisely:

- **`normalize(fields)`** applies your calendar's carry rules to out-of-range
  input (minute 65, month 13) the way out-of-range arguments to `new Date(...)`
  roll over. It is pure field arithmetic — timezone-independent, unrelated to
  any real instant. Don't route it through a date library that rejects
  out-of-range input instead of carrying.
- **`decompose(date, timezone)`** reports the wall-clock fields as observed in
  `timezone`.
- **`compose(fields, timezone)`** receives fields already in range and builds a
  `TDate`, and is the single place DST ambiguity resolves. The shared default
  sends a spring-forward gap to the first instant past it and a fall-back
  overlap to the earlier of the two; match that unless your date library
  deliberately differs.

The separation matters: calendar-aware code normalizes repeatedly while
searching for a date and composes once at the end, so a DST transition
perturbs only the answer rather than every step toward it.

Every runtime base class takes an `ITimeConverter<TDate>` in its constructor
and implements the conversion hooks by delegating to it. Write it once as a
`RuntimeHelper` class whose static methods match `ITimeConverter`'s shape —
a class value structurally satisfies the interface via its static side, so
no wrapping instance is needed:

```ts
export class RuntimeHelper {
  static convertToTimestamp(time: string | number | MyDate): number {
    /* ... */
  }
  static convertToUtcDate(time: string | number | MyDate): MyDate {
    /* ... */
  }
  static convertToLocalDate(timezone: TimezoneDefinition, time: string | number | MyDate): MyDate {
    /* ... */
  }
}
```

## Validating time inputs

Your converter receives whatever a caller passed to `parseToUtc`, `withFixedTime`
and friends, so it has to reject nonsense before handing it to the date library.
`@time-provider/core` exports `TimeInputValidator` for that, with static guards
the built-in plugins use:

```ts
import { TimeInputValidator } from "@time-provider/core";

static convertToTimestamp(time: string | number | MyDate): number {
  TimeInputValidator.assertValid(time); // throws on undefined, null, NaN, blank string
  /* ... */
}
```

- **`assertValid(time)`** — throws unless `time` is usable, rejecting
  `undefined`, `null`, `NaN`, and empty or whitespace-only strings. Typed as an
  assertion, so `time` narrows afterwards.
- **`throwInvalidTimeValue(time)`** — throws the same error directly, for when
  your own parsing rejects a value the generic guard accepts.
- **`throwInvalidTimezone(timezone)`** — the equivalent for an unusable
  `TimezoneDefinition`.

## Two entry points, two plugin classes

Like `core` itself, a plugin is split into a system half and a deterministic
half (see [Mental Model](/guide/mental-model)) — each with its own base
classes, imported from `@time-provider/core` and
`@time-provider/core/deterministic` respectively.

**System** (`index.ts`) — one runtime, forwarding its constructor arguments
plus `RuntimeHelper` into `BaseSystemRuntime`:

```ts
import { BaseSystemPlugin, BaseSystemRuntime, type TimezoneDefinition } from "@time-provider/core";

class SystemRuntime extends BaseSystemRuntime<MyDate> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): MyDate {
    /* ... */
  }
  utcNow(): MyDate {
    /* ... */
  }
  timestampNow(): number {
    /* ... */
  }
}

export class SystemPlugin extends BaseSystemPlugin<MyDate> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}

export const plugin: ISystemPlugin<MyDate> = new SystemPlugin();
```

**Deterministic** (`deterministic.ts`) — three runtimes (fixed, manual,
sequential), each extending the matching `Base*Runtime` from
`@time-provider/core/deterministic`. Only the manual one needs the
`advance*` methods, since only it implements `IAdvanceable`:

```ts
import {
  BaseDeterministicPlugin,
  BaseFixedRuntime,
  BaseManualRuntime,
  BaseSequentialRuntime,
} from "@time-provider/core/deterministic";

class FixedRuntime extends BaseFixedRuntime<MyDate> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | MyDate) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
}

class SequentialRuntime extends BaseSequentialRuntime<MyDate> {
  constructor(localTimezone: TimezoneDefinition, sequentialTimes: (string | number | MyDate)[]) {
    super(localTimezone, sequentialTimes, RuntimeHelper);
  }
}

class ManualRuntime extends BaseManualRuntime<MyDate> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | MyDate) {
    super(localTimezone, fixedTime, RuntimeHelper);
  }
  protected advanceYears(time: MyDate, years: number): MyDate {
    /* ... */
  }
  protected advanceMonths(time: MyDate, months: number): MyDate {
    /* ... */
  }
  protected advanceDays(time: MyDate, days: number): MyDate {
    /* ... */
  }
  protected advanceHours(time: MyDate, hours: number): MyDate {
    /* ... */
  }
  protected advanceMinutes(time: MyDate, minutes: number): MyDate {
    /* ... */
  }
  protected advanceSeconds(time: MyDate, seconds: number): MyDate {
    /* ... */
  }
  protected advanceMilliseconds(time: MyDate, milliseconds: number): MyDate {
    /* ... */
  }
}

export class DeterministicPlugin extends BaseDeterministicPlugin<MyDate> {
  protected readonly ManualRuntimeCtor = ManualRuntime;
  protected readonly FixedRuntimeCtor = FixedRuntime;
  protected readonly SequentialRuntimeCtor = SequentialRuntime;
}

export const plugin: IDeterministicPlugin<MyDate> = new DeterministicPlugin();
```

If your date library can't represent an arbitrary IANA timezone (like
native `Date` or plain Moment.js), extend `BaseUtcOnlySystemPlugin`/
`BaseUtcOnlyDeterministicPlugin` instead — their runtime constructors drop
the `localTimezone` parameter accordingly. See
[Mental Model](/guide/mental-model) for why the two hierarchies are kept
separate.

Export each `plugin` singleton under the matching name, matching every
built-in adapter, so it drops straight into the corresponding
`createTimeProvider.for(plugin)`.

For a complete worked example, read any of the built-in plugins' source —
`plugin-native` is the shortest (UTC-only), `plugin-dayjs` the shortest
full (timezone-aware) one — in the
[`packages/`](https://github.com/jaenyf/time-provider/tree/main/packages)
directory of the repository.
