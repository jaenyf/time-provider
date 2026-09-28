/** System Animation Frame addon.
 * @module */
import { addon } from "./addon.ts";

export type {
  AnimationFrameCallback,
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

export { addon };
export default addon;
