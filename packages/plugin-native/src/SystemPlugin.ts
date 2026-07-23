import { BaseUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";

export class SystemPlugin extends BaseUtcOnlySystemPlugin<Date> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
