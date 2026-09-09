import { addon } from "./addon.ts";

export type {
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { SystemAnimationFrameScheduler } from "./system-animation-frame-scheduler.ts";

export { addon };
export default addon;
