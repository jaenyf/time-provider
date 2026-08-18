import { AddonHelper } from "@time-provider/core";
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import type { WithCompatApi } from "./types.ts";
import { CompatRuntime } from "./compat-runtime.ts";

function createAddon<TDate>(): IDeterministicAddon<TDate, WithCompatApi> {
  return {
    applyToRuntime(runtime) {
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "compat",
        new CompatRuntime(runtime),
        undefined as unknown as WithCompatApi,
      );
    },
    clone(): IDeterministicAddon<TDate, WithCompatApi> {
      return createAddon<TDate>();
    },
  };
}

export const addon = createAddon();
