import type { IAddonBuilder } from "@time-provider/core";
import { CompatRuntime } from "./compat-runtime.ts";

/**
 * The compat addon-builder for a Time-Provider. Compose it with
 * `createTimeProvider.for(plugin).use(addon)` to add a `compat` property.
 */
export function addon<TDate>(): IAddonBuilder<CompatRuntime<TDate>> {
  return { create: () => new CompatRuntime<TDate>() };
}
