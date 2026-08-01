# IPerformance

```ts
type PerformanceEntryType =
  "mark" | "measure" | "resource" | "dns" | "function" | "gc" | "http" | "http2" | "net" | "node";

interface IPerformanceEntry {
  readonly name: string;
  readonly entryType: PerformanceEntryType;
  readonly startTime: number;
  readonly duration: number;
}

interface IPerformanceMark extends IPerformanceEntry {
  readonly entryType: "mark";
}

interface IPerformanceMeasure extends IPerformanceEntry {
  readonly entryType: "measure";
}

interface IPerformance {
  now(): number;
  get timeOrigin(): number;
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
API, scoped to one `ITimeProvider` instance instead of the process-wide
timeline:

```ts
timeProvider.performance.mark("start");
doWork();
const measure = timeProvider.performance.measure("work", "start");
measure.duration; // milliseconds between the "start" mark and now
```

- **`now()`** — a high-resolution timestamp, in milliseconds relative to
  `timeOrigin`.
- **`.timeOrigin`** — the timestamp this performance timeline started at.
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

Like `clock` and `scheduler`, `performance` is driven by whichever strategy
built the Time-Provider:

- **System** — `now()`/`timeOrigin` pass through to the host's real
  `performance` object.
- **Fixed, Manual, Sequential** — `now()` advances (or stays frozen) exactly
  in step with `clock.utcNow()`/`clock.advance()` on the same runtime, so a
  `measure()` between two marks reflects simulated time elapsed, not
  wall-clock time.
