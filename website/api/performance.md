# IPerformance

```ts
type DurationMilliseconds = Brand<number, "DurationMilliseconds">;
type EpochMilliseconds = Brand<number, "EpochMilliseconds">;

type PerformanceEntryType =
  "mark" | "measure" | "resource" | "dns" | "function" | "gc" | "http" | "http2" | "net" | "node";

interface IPerformanceEntry {
  readonly name: string;
  readonly entryType: PerformanceEntryType;
  readonly startTime: EpochMilliseconds;
  readonly duration: DurationMilliseconds;
}

interface IPerformanceMark extends IPerformanceEntry {
  readonly entryType: "mark";
}

interface IPerformanceMeasure extends IPerformanceEntry {
  readonly entryType: "measure";
}

interface IPerformanceMarkOptions {
  startTime?: EpochMilliseconds;
  detail?: unknown;
}

interface IPerformanceMeasureOptions {
  start?: string | EpochMilliseconds;
  end?: string | EpochMilliseconds;
  duration?: DurationMilliseconds;
  detail?: unknown;
}

interface IPerformance {
  now(): DurationMilliseconds;
  readonly timeOrigin: EpochMilliseconds;
  getEntries(): readonly IPerformanceEntry[];
  getEntriesByName(name: string, entryType?: PerformanceEntryType): readonly IPerformanceEntry[];
  getEntriesByType(entryType: PerformanceEntryType): readonly IPerformanceEntry[];
  mark(name: string, options?: IPerformanceMarkOptions): IPerformanceMark;
  measure(
    name: string,
    startMarkOrOptions?: string | IPerformanceMeasureOptions,
  ): IPerformanceMeasure;
  clearMarks(name?: string): void;
  clearMeasures(name?: string): void;
}
```

`timeProvider.performance` mirrors the shape of the browser/Node
[`Performance`](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
API, reached through the Time-Provider rather than the global object:

```ts
timeProvider.performance.mark("start");
doWork();
const measure = timeProvider.performance.measure("work", "start");
measure.duration; // milliseconds between the "start" mark and now
```

- **`now()`** — a high-resolution timestamp, in milliseconds relative to
  `timeOrigin`.
- **`.timeOrigin`** — the timestamp this performance timeline started at. On
  a deterministic Time-Provider that's the clock's own timestamp the first
  time `now()` or `timeOrigin` is read, not when the runtime was built.
- **`getEntries()` / `getEntriesByName(name, type?)` / `getEntriesByType(type)`**
  — read back previously recorded marks/measures.
- **`mark(name, options?)`** — records an `IPerformanceMark` at the current
  time (or `options.startTime`, if given).
- **`measure(name, startMarkOrOptions?)`** — records an `IPerformanceMeasure`
  between two points, given as a mark name, explicit timestamps
  (`{ start, end }`), or a `duration` relative to one of them.
- **`clearMarks(name?)` / `clearMeasures(name?)`** — remove recorded
  entries, optionally filtered by name.

## Backed by the clock strategy

Like `clock` and `timers`, `performance` is driven by whichever strategy
built the Time-Provider:

- **System** — every method passes straight through to the host's real
  `performance` object, so the timeline is the process-wide one: a mark
  recorded here is visible to `performance.getEntries()` and to every other
  system Time-Provider in the process.
- **Fixed, Manual, Sequential** — the runtime keeps its own entry list, and
  `now()` advances (or stays frozen) exactly in step with
  `clock.utcNow()`/`clock.advance()` on the same runtime, so a `measure()`
  between two marks reflects simulated time elapsed, not wall-clock time.
  Nothing here touches the global timeline, and two deterministic
  Time-Providers never see each other's entries.
