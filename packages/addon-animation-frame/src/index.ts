import { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

export type {
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

/** The animation-frame addon for a system (real time) Time-Provider. */
// export const addon = function <TDate>() {
//   return new SystemAnimationFrameScheduler<TDate>();
// };

export const addon = SystemAnimationFrameScheduler;
export default addon;
