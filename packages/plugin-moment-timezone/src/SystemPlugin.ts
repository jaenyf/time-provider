import { BaseSystemPlugin } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import moment from "moment-timezone";

export class SystemPlugin extends BaseSystemPlugin<moment.Moment> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
