/** System compatibility addon.
 * @module */
import { addon } from "./addon.ts";

export type {
  ICompatApi,
  IPerformanceEntry,
  PerformanceEntryType,
  WithCompatApi,
} from "./types.ts";
export { CompatRuntime } from "./compat-runtime.ts";

export { addon };
export default addon;
