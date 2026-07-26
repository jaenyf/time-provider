import type {
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
  now = () => performance.now();
  get timeOrigin(): number {
    return performance.timeOrigin;
  }
  getEntries = () => performance.getEntries();
  getEntriesByName = (
    name: string,
    entryType?: PerformanceEntryType,
  ): readonly IPerformanceEntry[] => performance.getEntriesByName(name, entryType);
  getEntriesByType = (entryType: PerformanceEntryType): readonly IPerformanceEntry[] =>
    performance.getEntriesByType(entryType);
  mark = (name: string, options?: IPerformanceMarkOptions): IPerformanceMark =>
    performance.mark(name, options);
  measure = (
    name: string,
    startMarkOrOptions?: string | IPerformanceMeasureOptions,
  ): IPerformanceMeasure => {
    if (startMarkOrOptions === undefined) return performance.measure(name);
    if (typeof startMarkOrOptions === "string")
      return performance.measure(name, startMarkOrOptions);
    return performance.measure(name, startMarkOrOptions);
  };
  clearMarks = (name?: string): void => performance.clearMarks(name);
  clearMeasures = (name?: string): void => performance.clearMeasures(name);
}
