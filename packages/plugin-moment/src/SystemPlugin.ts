import { BaseUtcOnlySystemPlugin } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import moment from "moment";

export class SystemPlugin extends BaseUtcOnlySystemPlugin<moment.Moment> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
