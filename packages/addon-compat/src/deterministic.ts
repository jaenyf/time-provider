import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { addon as sharedAddon } from "./addon.ts";
import type { WithCompatApi } from "./types.ts";

export type { ICompatApi, WithCompatApi } from "./types.ts";
export { CompatRuntime } from "./compat-runtime.ts";

export const addon: IDeterministicAddon<unknown, WithCompatApi> = sharedAddon;
export default addon;
