import type {
  ITimingEntry,
  ITimingMark,
  ITimingMarkOptions,
  ITimingMeasure,
  ITimingMeasureOptions,
  ITimings,
  ITimingsFilter,
} from "../types/types.ts";
import { assertMeasureOptions, matchesTimingsFilter } from "./timings-helpers.ts";

function shouldClearMarks(filter?: ITimingsFilter): boolean {
  return filter?.kind !== "measure";
}

function shouldClearMeasures(filter?: ITimingsFilter): boolean {
  return filter?.kind !== "mark";
}

/** Marks and measures on the host performance timeline. */
export class SystemTimings implements ITimings {
  entries = (filter?: ITimingsFilter): readonly ITimingEntry[] =>
    (performance.getEntries() as unknown as ITimingEntry[]).filter(
      (entry) =>
        (entry.entryType === "mark" || entry.entryType === "measure") &&
        matchesTimingsFilter(entry, filter),
    );

  clear = (filter?: ITimingsFilter): void => {
    if (shouldClearMarks(filter)) {
      performance.clearMarks(filter?.name);
    }
    if (shouldClearMeasures(filter)) {
      performance.clearMeasures(filter?.name);
    }
  };

  mark = (name: string, options?: ITimingMarkOptions): ITimingMark =>
    performance.mark(name, options) as unknown as ITimingMark;

  measure = (name: string, options?: ITimingMeasureOptions): ITimingMeasure => {
    assertMeasureOptions(options);
    /*
     * A browser throws when options carry neither start nor end, Node does not: an explicit start
     * at the origin, which is what both default to, keeps every host on the same behaviour.
     */
    return performance.measure(name, {
      ...options,
      start: options?.start ?? (options?.duration === undefined ? 0 : undefined),
    }) as unknown as ITimingMeasure;
  };
}
