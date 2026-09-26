import type { ITimingEntry, ITimingMeasureOptions, ITimingsFilter } from "../types/types.ts";

/** Whether `entry` matches `filter`. */
export function matchesTimingsFilter(entry: ITimingEntry, filter?: ITimingsFilter): boolean {
  return (
    (filter?.name === undefined || entry.name === filter.name) &&
    (filter?.kind === undefined || entry.entryType === filter.kind)
  );
}

/** Validates that `options` describe one interval. */
export function assertMeasureOptions(options?: ITimingMeasureOptions): void {
  if (options?.duration === undefined) {
    return;
  }
  if (options.start !== undefined && options.end !== undefined) {
    throw new TypeError("The measure options are over-determined");
  }
  if (options.start === undefined && options.end === undefined) {
    throw new TypeError("The measure options are under-determined");
  }
}
