import { toDuration, toInstant } from "../helpers/branded-types.ts";
import type {
  EpochMilliseconds,
  IPerformance,
  IPerformanceEntry,
  IPerformanceMark,
  IPerformanceMarkOptions,
  IPerformanceMeasure,
  IPerformanceMeasureOptions,
  PerformanceEntryType,
} from "../types/types.ts";

/**
 * Pass-through for the system performance API
 */
export class SystemPerformance implements IPerformance {
  now = () => toDuration({ milliseconds: performance.now() });
  get timeOrigin(): EpochMilliseconds {
    return toInstant({ milliseconds: performance.timeOrigin });
  }
  getEntries = () => performance.getEntries() as unknown as IPerformanceEntry[];
  getEntriesByName = (
    name: string,
    entryType?: PerformanceEntryType,
  ): readonly IPerformanceEntry[] =>
    performance.getEntriesByName(name, entryType) as unknown as IPerformanceEntry[];
  getEntriesByType = (entryType: PerformanceEntryType): readonly IPerformanceEntry[] =>
    performance.getEntriesByType(entryType) as unknown as IPerformanceEntry[];
  mark = (name: string, options?: IPerformanceMarkOptions): IPerformanceMark =>
    performance.mark(name, options) as unknown as IPerformanceMark;
  measure = (
    name: string,
    startMarkOrOptions?: string | IPerformanceMeasureOptions,
  ): IPerformanceMeasure =>
    performance.measure(
      name,
      startMarkOrOptions as Parameters<typeof performance.measure>[1],
    ) as unknown as IPerformanceMeasure;
  clearMarks = (name?: string): void => performance.clearMarks(name);
  clearMeasures = (name?: string): void => performance.clearMeasures(name);
}
