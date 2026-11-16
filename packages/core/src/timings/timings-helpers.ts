import type { ITimingEntry, ITimingMeasureOptions, ITimingsFilter } from "../types/types.ts";

function matchesName(entry: ITimingEntry, filter?: ITimingsFilter): boolean {
  return filter?.name === undefined || entry.name === filter.name;
}

function matchesKind(entry: ITimingEntry, filter?: ITimingsFilter): boolean {
  return filter?.kind === undefined || entry.entryType === filter.kind;
}

function hasBothBounds(options?: ITimingMeasureOptions): boolean {
  return options?.start !== undefined && options?.end !== undefined;
}

function hasNeitherBound(options?: ITimingMeasureOptions): boolean {
  return options?.start === undefined && options?.end === undefined;
}

/** Whether `entry` matches `filter`. */
export function matchesTimingsFilter(entry: ITimingEntry, filter?: ITimingsFilter): boolean {
  return matchesName(entry, filter) && matchesKind(entry, filter);
}

/** Validates that `options` describe one interval. */
export function assertMeasureOptions(options?: ITimingMeasureOptions): void {
  if (options?.duration === undefined) {
    return;
  }
  if (hasBothBounds(options)) {
    throw new TypeError("The measure options are over-determined");
  }
  if (hasNeitherBound(options)) {
    throw new TypeError("The measure options are under-determined");
  }
}
