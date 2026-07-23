import type { IUtcOnlySystemPlugin } from "./IUtcOnlySystemPlugin.ts";
import type { IUtcOnlyDeterministicPlugin } from "./IUtcOnlyDeterministicPlugin.ts";

/**
 * A plugin whose underlying date library has no timezone-aware date type, so
 * it can only ever expose UTC time, across every runtime kind. See `IPlugin`
 * for why this is composed rather than declared as one interface.
 */
export type IUtcOnlyPlugin<TDate> = IUtcOnlySystemPlugin<TDate> &
  IUtcOnlyDeterministicPlugin<TDate>;
