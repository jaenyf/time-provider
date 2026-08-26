import { CompatRuntime } from "./compat-runtime.ts";

export type { ICompatApi, WithCompatApi } from "./types.ts";
export { CompatRuntime } from "./compat-runtime.ts";

//export const addon = sharedAddon;
export const addon = CompatRuntime;
export default addon;
