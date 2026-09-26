/** Deterministic Animation Frame addon.
 * @module */
import { AddonBuilderBase, type IAddonBuilder } from "@time-provider/core";
import { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";
import type { WithAnimationFrameApi } from "./types.ts";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";

export type {
  IAnimationFrameScheduler as IAnimationFrameApi,
  WithAnimationFrameApi,
} from "./types.ts";
export { DeterministicAnimationFrameScheduler } from "./deterministic-animation-frame-scheduler.ts";

type DeterministicAnimationFrameAddon<TDate> = WithAnimationFrameApi<TDate> &
  IDeterministicAddon<TDate>;

/** Extra builder method contributed by the animation-frame addon. */
export interface IAnimationFrameBuilderExtra {
  /**
   * Sets the simulated host refresh rate in Hz; defaults to `60`.
   * @param rate The refresh rate in Hz.
   * @returns This builder.
   */
  withHostFramesRate<TBuilder>(this: TBuilder, rate: number): TBuilder;
}

/** Deterministic animation-frame addon builder. */
class DeterministicAnimationFrameAddonBuilder<TDate>
  extends AddonBuilderBase<TDate, DeterministicAnimationFrameAddon<TDate>>
  implements IAnimationFrameBuilderExtra
{
  #getHostFramesRate: () => number | undefined;

  withHostFramesRate: <TBuilder>(this: TBuilder, rate: number) => TBuilder;

  constructor(typeHint?: TDate) {
    super(typeHint);
    let hostFramesRate: number | undefined;
    this.#getHostFramesRate = () => hostFramesRate;
    this.withHostFramesRate = function <TBuilder>(this: TBuilder, rate: number): TBuilder {
      hostFramesRate = rate;
      return this;
    };
  }

  create(): DeterministicAnimationFrameAddon<TDate> {
    const scheduler = new DeterministicAnimationFrameScheduler<TDate>();
    const hostFramesRate = this.#getHostFramesRate();
    if (hostFramesRate !== undefined) {
      scheduler.hostFramesRate = hostFramesRate;
    }
    return scheduler as unknown as DeterministicAnimationFrameAddon<TDate>;
  }
}

/**
 * Deterministic animation-frame addon builder.
 * @param typeHint Infers `TDate`; unused.
 */
export function addon<TDate>(
  typeHint?: TDate,
): IAddonBuilder<DeterministicAnimationFrameAddon<TDate>> & IAnimationFrameBuilderExtra {
  return new DeterministicAnimationFrameAddonBuilder<TDate>(typeHint);
}
export default addon;
