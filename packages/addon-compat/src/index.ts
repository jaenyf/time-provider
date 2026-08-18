import type { ISystemAddon } from "@time-provider/core";
import { addon as sharedAddon } from "./addon.ts";
import type { WithCompatApi } from "./types.ts";

export type { ICompatApi, WithCompatApi } from "./types.ts";
export { CompatRuntime } from "./compat-runtime.ts";

export const addon: ISystemAddon<unknown, WithCompatApi> = sharedAddon;
export default addon;
