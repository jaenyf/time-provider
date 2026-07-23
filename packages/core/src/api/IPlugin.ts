import type { ISystemPlugin } from "./ISystemPlugin.ts";
import type { IDeterministicPlugin } from "./IDeterministicPlugin.ts";

/**
 * A plugin whose underlying date library has a timezone-aware date type, so
 * it can expose both local and UTC time, across every runtime kind (system,
 * fixed, manual, sequential).
 *
 * Composed from `ISystemPlugin` and `IDeterministicPlugin` rather than
 * declared as one interface, so a plugin package can implement - and export -
 * the two capabilities as two separate objects. `createTimeProvider`/
 * `createDeterministicTimeProvider` each only accept the narrower interface
 * they need; this combined type exists for callers (tests, plugin authors)
 * that want to describe "a plugin implementing everything" in one place.
 */
export type IPlugin<TDate> = ISystemPlugin<TDate> & IDeterministicPlugin<TDate>;
