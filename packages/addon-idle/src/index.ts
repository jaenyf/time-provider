/** Idle addon for Time-Provider's system runtime.
 * @module */
import { addon } from "./addon.ts";

export type { IIdleApi, WithIdleApi } from "./types.ts";
export { SystemIdleScheduler } from "./system-idle-scheduler.ts";

export { addon };
export default addon;
