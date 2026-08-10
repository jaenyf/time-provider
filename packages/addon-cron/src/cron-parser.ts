import type {
  CalendarSchemeFields,
  ComposableCalendarSchemeFields,
  DefaultCalendarSchemeMonthName,
  DefaultCalendarSchemeWeekdayName,
  ICalendarScheme,
} from "@time-provider/core";
import { CalendarSchemeFieldsHelper } from "@time-provider/core";

/**
 * What a single cron field accepts, entirely derived from the runtime's {@link ICalendarScheme}
 */
interface FieldBounds {
  readonly min: number;
  readonly max: number;
  /** Names accepted for this field, in calendar order - `names[0]` denotes {@link min}. */
  readonly names?: readonly string[];
  /**
   * Whether {@link max} is an alias for {@link min} rather than a distinct value - the day-of-week
   * field's usual cron convention (`7` means the same day as `0` on a 7-day week).
   */
  readonly wrapsMaxToMin?: boolean;
}

function minuteBounds<TDate>(calendarScheme: ICalendarScheme<TDate, string, string>): FieldBounds {
  return { min: 0, max: calendarScheme.minutesPerHour() - 1 };
}
function hourBounds<TDate>(calendarScheme: ICalendarScheme<TDate, string, string>): FieldBounds {
  return { min: 0, max: calendarScheme.hoursPerDay() - 1 };
}
function dayOfMonthBounds<TDate>(
  calendarScheme: ICalendarScheme<TDate, string, string>,
): FieldBounds {
  return { min: 1, max: calendarScheme.maxDayOfMonth() };
}
function monthBounds<TDate>(calendarScheme: ICalendarScheme<TDate, string, string>): FieldBounds {
  return { min: 1, max: calendarScheme.monthsPerYear(), names: calendarScheme.monthNames };
}
function dayOfWeekBounds<TDate>(
  calendarScheme: ICalendarScheme<TDate, string, string>,
): FieldBounds {
  return {
    min: 0,
    max: calendarScheme.daysPerWeek(),
    names: calendarScheme.weekdayNames,
    wrapsMaxToMin: true,
  };
}

interface ParsedField {
  readonly values: ReadonlySet<number>;
  readonly isWildcard: boolean;
}

export interface ParsedCronExpression {
  readonly minute: ParsedField;
  readonly hour: ParsedField;
  readonly dayOfMonth: ParsedField;
  readonly month: ParsedField;
  readonly dayOfWeek: ParsedField;
}

function throwInvalidCronExpression(expression: string, reason: string): never {
  throw new Error(`Invalid cron expression "${expression}": ${reason}`);
}

/** Collapses a {@link FieldBounds.wrapsMaxToMin} alias onto the value it aliases. */
function applyMaxAlias(value: number, bounds: FieldBounds): number {
  return bounds.wrapsMaxToMin && value === bounds.max ? bounds.min : value;
}

/** The number `name` denotes for this field, or `undefined` if the calendar doesn't name it. */
function resolveName(name: string, bounds: FieldBounds): number | undefined {
  if (bounds.names === undefined) {
    return undefined;
  }
  const upper = name.toUpperCase();
  const index = bounds.names.findIndex((candidate) => candidate.toUpperCase() === upper);
  return index === -1 ? undefined : index + bounds.min;
}

/*
 * Deliberately stricter than the native Number() coercion it replaces: Number() also accepts hex
 * ("0x1E"), octal-ish ("0o17"), exponential ("1e1"), and whitespace-only (-> 0) strings, silently
 * turning a typo into a different, still-"valid" field value instead of rejecting it. A plain
 * optionally-signed run of digits is all a cron field value or step is ever meant to look like.
 */
const INTEGER_PATTERN = /^-?\d+$/;

function parseStrictInteger(token: string): number | undefined {
  return INTEGER_PATTERN.test(token) ? Number(token) : undefined;
}

function parseToken(token: string, bounds: FieldBounds, expression: string): number {
  const named = resolveName(token, bounds);
  if (named !== undefined) {
    return named;
  }
  const value = parseStrictInteger(token);
  if (value === undefined) {
    throwInvalidCronExpression(expression, `"${token}" is not a valid value`);
  }
  if (value < bounds.min || value > bounds.max) {
    throwInvalidCronExpression(
      expression,
      `"${token}" is out of range (expected ${bounds.min}-${bounds.max})`,
    );
  }
  return value;
}

function parsePart(part: string, bounds: FieldBounds, expression: string, into: Set<number>): void {
  const stepSegments = part.split("/");
  if (stepSegments.length > 2) {
    throwInvalidCronExpression(expression, `"${part}" has more than one step`);
  }
  const [rangeOrStar, stepText] = stepSegments;
  let start: number;
  let end: number;
  if (rangeOrStar === "*") {
    start = bounds.min;
    end = bounds.max;
  } else if (rangeOrStar.includes("-")) {
    const rangeSegments = rangeOrStar.split("-");
    if (rangeSegments.length > 2) {
      throwInvalidCronExpression(expression, `range "${rangeOrStar}" is malformed`);
    }
    const [fromText, toText] = rangeSegments;
    start = parseToken(fromText, bounds, expression);
    end = parseToken(toText, bounds, expression);
    if (end < start) {
      throwInvalidCronExpression(expression, `range "${rangeOrStar}" is out of order`);
    }
  } else {
    start = end = parseToken(rangeOrStar, bounds, expression);
  }
  let step = 1;
  if (stepText !== undefined) {
    const parsedStep = parseStrictInteger(stepText);
    if (parsedStep === undefined || parsedStep < 1) {
      throwInvalidCronExpression(expression, `"${stepText}" is not a valid step`);
    }
    step = parsedStep;
  }
  for (let value = start; value <= end; value += step) {
    into.add(applyMaxAlias(value, bounds));
  }
}

function parseField(fieldText: string, bounds: FieldBounds, expression: string): ParsedField {
  const values = new Set<number>();
  for (const part of fieldText.split(",")) {
    parsePart(part, bounds, expression, values);
  }
  return { values, isWildcard: fieldText === "*" };
}

/**
 * Parses a standard 5-field cron expression. Each field accepts `*`, a single value, a `a-b`
 * range, a `.../n` step, or a comma-separated list of any of those - e.g. `"0 9 * * MON-FRI"`,
 * `"*\/15 8-18 * * *"`.
 *
 * Every field's valid range and accepted names come from `adapter`, so the same syntax describes whatever calendar backs the runtime.
 * @throws if `expression` doesn't have exactly 5 whitespace-separated fields, or any field is malformed or out of range for `adapter`'s calendar.
 */
export function parseCronExpression<TDate, TMonthName extends string, TWeekdayName extends string>(
  expression: string,
  calendarScheme: ICalendarScheme<TDate, TMonthName, TWeekdayName>,
): ParsedCronExpression {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throwInvalidCronExpression(
      expression,
      `expected 5 fields (minute hour day-of-month month day-of-week), got ${fields.length}`,
    );
  }
  const [minuteText, hourText, dayOfMonthText, monthText, dayOfWeekText] = fields;
  return {
    minute: parseField(minuteText, minuteBounds(calendarScheme), expression),
    hour: parseField(hourText, hourBounds(calendarScheme), expression),
    dayOfMonth: parseField(dayOfMonthText, dayOfMonthBounds(calendarScheme), expression),
    month: parseField(monthText, monthBounds(calendarScheme), expression),
    dayOfWeek: parseField(dayOfWeekText, dayOfWeekBounds(calendarScheme), expression),
  };
}

//#region JSON spec

/**
 * The month names accepted by a runtime backed by the default Gregorian calendar. A runtime whose
 * plugin supplies a different {@link ICalendarScheme} names its months differently - pass that
 * calendar's names as {@link ICronSpec}'s first type argument to type-check against those instead.
 */
export type MonthName = DefaultCalendarSchemeMonthName;
/** The day-of-week names accepted by the default Gregorian calendar - see {@link MonthName}. */
export type DayOfWeekName = DefaultCalendarSchemeWeekdayName;
/** A string that looks like a number (e.g. `"9"`), accepted anywhere a number is - the runtime
 * parses it the same way as the equivalent number. */
export type NumericString = `${number}`;

/** A `{ from, to, step? }` range for a purely numeric field (`minute`, `hour`, `dayOfMonth`). */
export interface CronNumericRangeSpec {
  readonly from: number | NumericString;
  readonly to: number | NumericString;
  readonly step?: number;
}

/** A `{ from, to, step? }` range for the `month` field - `from`/`to` accept a month name
 * anywhere a number is accepted. */
export interface CronMonthRangeSpec<TMonthName extends string = MonthName> {
  readonly from: number | NumericString | TMonthName;
  readonly to: number | NumericString | TMonthName;
  readonly step?: number;
}

/** A `{ from, to, step? }` range for the `dayOfWeek` field - `from`/`to` accept a day-of-week
 * name anywhere a number is accepted. */
export interface CronDayOfWeekRangeSpec<TWeekdayName extends string = DayOfWeekName> {
  readonly from: number | NumericString | TWeekdayName;
  readonly to: number | NumericString | TWeekdayName;
  readonly step?: number;
}

/**
 * The `minute`/`hour`/`dayOfMonth` field value in {@link ICronSpec}: the string `"*"` for every
 * value, a single number or {@link NumericString}, a {@link CronNumericRangeSpec}, or an array
 * mixing any of those.
 */
export type CronNumericFieldSpec =
  | "*"
  | number
  | NumericString
  | CronNumericRangeSpec
  | (number | NumericString | CronNumericRangeSpec)[];

/**
 * The `month` field value in {@link ICronSpec}: the string `"*"` for every value, a single
 * number, {@link NumericString}, or month name, a {@link CronMonthRangeSpec}, or an array mixing
 * any of those.
 */
export type CronMonthFieldSpec<TMonthName extends string = MonthName> =
  | "*"
  | number
  | NumericString
  | TMonthName
  | CronMonthRangeSpec<TMonthName>
  | (number | NumericString | TMonthName | CronMonthRangeSpec<TMonthName>)[];

/**
 * The `dayOfWeek` field value in {@link ICronSpec}: the string `"*"` for every value, a single
 * number, {@link NumericString}, or day-of-week name, a {@link CronDayOfWeekRangeSpec}, or an
 * array mixing any of those.
 */
export type CronDayOfWeekFieldSpec<TWeekdayName extends string = DayOfWeekName> =
  | "*"
  | number
  | NumericString
  | TWeekdayName
  | CronDayOfWeekRangeSpec<TWeekdayName>
  | (number | NumericString | TWeekdayName | CronDayOfWeekRangeSpec<TWeekdayName>)[];

/**
 * A JSON-friendly alternative to a cron expression string.
 * The same 5 fields a cron expression encodes, addressed by name instead of position.
 * Each field defaults to `"*"` (every value) when omitted;
 * `month` and `dayOfWeek` are typed to only accept their own names, so passing e.g. a
 * day-of-week name to `hour` is a compile-time error rather than a runtime one.
 *
 * The name types default to the Gregorian calendar's, which is what every plugin shipped today
 * uses; a runtime backed by a different calendar parameterizes them with its own names.
 */
export interface ICronSpec<
  TMonthName extends string = MonthName,
  TWeekdayName extends string = DayOfWeekName,
> {
  readonly minute?: CronNumericFieldSpec;
  readonly hour?: CronNumericFieldSpec;
  readonly dayOfMonth?: CronNumericFieldSpec;
  readonly month?: CronMonthFieldSpec<TMonthName>;
  readonly dayOfWeek?: CronDayOfWeekFieldSpec<TWeekdayName>;
}

/**
 * The structural shape every {@link ICronSpec} field value has in common, regardless of which names it accepts.
 * Used internally so the parsing logic below is written once.
 */
type AnyCronFieldSpec =
  | number
  | string
  | { from: number | string; to: number | string; step?: number }
  | (number | string | { from: number | string; to: number | string; step?: number })[];

function throwInvalidCronSpec(fieldName: string, reason: string): never {
  throw new Error(`Invalid cron spec field "${fieldName}": ${reason}`);
}

function resolveSpecAtom(atom: number | string, bounds: FieldBounds, fieldName: string): number {
  let value: number;
  if (typeof atom === "string") {
    const named = resolveName(atom, bounds);
    if (named !== undefined) {
      return named;
    }
    const parsed = parseStrictInteger(atom);
    if (parsed === undefined) {
      throwInvalidCronSpec(fieldName, `"${atom}" is not a valid value`);
    }
    value = parsed;
  } else {
    if (!Number.isInteger(atom)) {
      throwInvalidCronSpec(fieldName, `${atom} is not a valid value`);
    }
    value = atom;
  }
  if (value < bounds.min || value > bounds.max) {
    throwInvalidCronSpec(
      fieldName,
      `${value} is out of range (expected ${bounds.min}-${bounds.max})`,
    );
  }
  return value;
}

function wildcardField(bounds: FieldBounds): ParsedField {
  const values = new Set<number>();
  for (let value = bounds.min; value <= bounds.max; value++) {
    values.add(applyMaxAlias(value, bounds));
  }
  return { values, isWildcard: true };
}

function parseSpecField(
  fieldValue: AnyCronFieldSpec | undefined,
  bounds: FieldBounds,
  fieldName: string,
): ParsedField {
  if (fieldValue === undefined || fieldValue === "*") {
    return wildcardField(bounds);
  }
  const values = new Set<number>();
  const atoms = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
  for (const atom of atoms) {
    if (typeof atom === "object") {
      const start = resolveSpecAtom(atom.from, bounds, fieldName);
      const end = resolveSpecAtom(atom.to, bounds, fieldName);
      if (end < start) {
        throwInvalidCronSpec(fieldName, `range ${JSON.stringify(atom)} is out of order`);
      }
      const step = atom.step ?? 1;
      if (!Number.isInteger(step) || step < 1) {
        throwInvalidCronSpec(fieldName, `step ${JSON.stringify(atom.step)} is not valid`);
      }
      for (let value = start; value <= end; value += step) {
        values.add(applyMaxAlias(value, bounds));
      }
    } else {
      values.add(applyMaxAlias(resolveSpecAtom(atom, bounds, fieldName), bounds));
    }
  }
  return { values, isWildcard: false };
}

/**
 * Parses a JSON cron spec - see {@link ICronSpec}. Field ranges and names come from `adapter`,
 * exactly as for {@link parseCronExpression}.
 * @throws if any field value is malformed or out of range for `adapter`'s calendar.
 */
export function parseCronSpec<TDate, TMonthName extends string, TWeekdayName extends string>(
  /*
    NoInfer keeps the name types coming from `adapter` alone. Without it, a bad name in `spec`
    (e.g. a month name given to dayOfWeek) would widen the inferred type to include itself rather
    than being rejected against the calendar's own names - silently turning the compile-time
    field/name mismatch check into a no-op.
  */
  spec: ICronSpec<NoInfer<TMonthName>, NoInfer<TWeekdayName>>,
  calendarScheme: ICalendarScheme<TDate, TMonthName, TWeekdayName>,
): ParsedCronExpression {
  return {
    minute: parseSpecField(spec.minute, minuteBounds(calendarScheme), "minute"),
    hour: parseSpecField(spec.hour, hourBounds(calendarScheme), "hour"),
    dayOfMonth: parseSpecField(spec.dayOfMonth, dayOfMonthBounds(calendarScheme), "dayOfMonth"),
    month: parseSpecField(spec.month, monthBounds(calendarScheme), "month"),
    dayOfWeek: parseSpecField(spec.dayOfWeek, dayOfWeekBounds(calendarScheme), "dayOfWeek"),
  };
}

/**
 * Translates a cron expression string into its {@link ICronSpec} JSON equivalent, e.g. to accept
 * either representation from a caller while only ever storing/transmitting the JSON one.
 */
export function cronExpressionToSpec<TDate, TMonthName extends string, TWeekdayName extends string>(
  expression: string,
  calendarScheme: ICalendarScheme<TDate, TMonthName, TWeekdayName>,
): ICronSpec<TMonthName, TWeekdayName> {
  const parsed = parseCronExpression(expression, calendarScheme);
  const toFieldSpec = (field: ParsedField): "*" | number[] =>
    field.isWildcard ? "*" : [...field.values].sort((a, b) => a - b);
  return {
    minute: toFieldSpec(parsed.minute),
    hour: toFieldSpec(parsed.hour),
    dayOfMonth: toFieldSpec(parsed.dayOfMonth),
    month: toFieldSpec(parsed.month),
    dayOfWeek: toFieldSpec(parsed.dayOfWeek),
  };
}

//#endregion

//#region next-occurrence computation

function dayMatches(parsed: ParsedCronExpression, fields: CalendarSchemeFields): boolean {
  const { dayOfMonth, dayOfWeek } = parsed;
  if (dayOfMonth.isWildcard && dayOfWeek.isWildcard) {
    return true;
  }
  const domMatches = dayOfMonth.values.has(fields.day);
  const dowMatches = dayOfWeek.values.has(fields.weekday);
  if (dayOfMonth.isWildcard) {
    return dowMatches;
  }
  if (dayOfWeek.isWildcard) {
    return domMatches;
  }
  // POSIX cron's well-known quirk: when BOTH fields are restricted, a match on either one counts.
  return domMatches || dowMatches;
}

/*
 * A genuinely impossible expression (e.g. "0 0 31 2 *" - February never has a 31st) must still
 * terminate rather than search forever. Bounding by calendar span rather than a flat iteration
 * count fails fast: the search steps by month/day/hour/minute, so a flat count generous enough to
 * legitimately resolve a rare-but-real expression (e.g. a leap-day-only schedule, which can be up
 * to 8 years out around a century boundary that skips a leap year) is, in the iteration-heavy
 * month-skipping path, generous enough to search tens of thousands of years - turning a single
 * mistyped/impossible expression into a real, synchronous multi-hundred-millisecond stall. 10
 * years comfortably covers that worst realistic case with margin, and a genuinely impossible
 * expression now fails in at most a few hundred iterations instead.
 */
const MAX_SEARCH_YEARS_AHEAD = 10;

/**
 * Computes the next `TDate`, strictly after `from`, at which `parsed` matches - in `timezone`'s
 * wall-clock calendar, per `adapter`. On a wall-clock instant that a DST transition skips (a
 * "spring forward" gap), resolves to the first instant after the gap; on one a DST transition
 * repeats (a "fall back" overlap), resolves to the earlier of the two occurrences - see
 * {@link ICalendarScheme.compose}.
 * @throws if no match is found within a multi-year search bound (the expression can never match,
 * e.g. a day-of-month/month combination that never occurs, like `"0 0 31 2 *"`).
 */
export function computeNextOccurrence<TDate>(
  parsed: ParsedCronExpression,
  from: TDate,
  timezone: string,
  calendarScheme: ICalendarScheme<TDate, string, string>,
): TDate {
  const fromFields = calendarScheme.decompose(from, timezone);
  const step = (fields: ComposableCalendarSchemeFields): CalendarSchemeFields =>
    calendarScheme.normalize(fields);
  let fields = step({
    ...CalendarSchemeFieldsHelper.toComposable(fromFields),
    minute: fromFields.minute + 1,
  });
  const searchLimitYear = fromFields.year + MAX_SEARCH_YEARS_AHEAD;

  while (fields.year <= searchLimitYear) {
    if (!parsed.month.values.has(fields.month)) {
      fields = step({
        year: fields.year,
        month: fields.month + 1,
        day: 1,
        hour: 0,
        minute: 0,
      });
      continue;
    }
    if (!dayMatches(parsed, fields)) {
      fields = step({
        ...CalendarSchemeFieldsHelper.toComposable(fields),
        day: fields.day + 1,
        hour: 0,
        minute: 0,
      });
      continue;
    }
    if (!parsed.hour.values.has(fields.hour)) {
      fields = step({
        ...CalendarSchemeFieldsHelper.toComposable(fields),
        hour: fields.hour + 1,
        minute: 0,
      });
      continue;
    }
    if (!parsed.minute.values.has(fields.minute)) {
      fields = step({
        ...CalendarSchemeFieldsHelper.toComposable(fields),
        minute: fields.minute + 1,
      });
      continue;
    }
    // Every intermediate step above stayed in pure calendar-field arithmetic (adapter.normalize),
    // never touching the timezone - DST ambiguity is only resolved here, once, for the actual match.
    return calendarScheme.compose(CalendarSchemeFieldsHelper.toComposable(fields), timezone);
  }
  throw new Error("No matching cron occurrence found - this expression can never match");
}

//#endregion
