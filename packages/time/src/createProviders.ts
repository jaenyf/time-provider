import type { TimeAdapter } from "./TimeAdapter.ts";
import type { TimeProvider } from "./TimeProvider.ts";
import type { FixedTimeAdapter } from "./FixedTimeAdapter.ts";
import type { FixedTimeProvider } from "./FixedTimeProvider.ts";

export function createTimeProvider<TDate>(adapter: TimeAdapter<TDate>): TimeProvider<TDate> {
  return adapter;
}
export function createFixedTimeProvider<TDate>(
  adapter: FixedTimeAdapter<TDate>,
): FixedTimeProvider<TDate> {
  return adapter;
}
