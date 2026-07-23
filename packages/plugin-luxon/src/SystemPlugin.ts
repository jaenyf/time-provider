import { BaseSystemPlugin } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import { DateTime } from "luxon";

export class SystemPlugin extends BaseSystemPlugin<DateTime> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
