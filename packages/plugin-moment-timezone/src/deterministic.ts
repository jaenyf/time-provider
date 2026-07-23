import type { IDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./DeterministicPlugin.ts";
import moment from "moment-timezone";

export const plugin: IDeterministicPlugin<moment.Moment> = new DeterministicPlugin();
