import { BaseSystemPlugin } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";

export class SystemPlugin extends BaseSystemPlugin<Temporal.ZonedDateTime> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
