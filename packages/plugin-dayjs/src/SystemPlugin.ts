import { BaseSystemPlugin } from "@time-provider/core";
import { SystemRuntime } from "./SystemRuntime.ts";
import dayjs from "dayjs";

export class SystemPlugin extends BaseSystemPlugin<dayjs.Dayjs> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
