import type { IUtcOnlyDeterministicPlugin } from "@time-provider/core/deterministic";
import { DeterministicPlugin } from "./DeterministicPlugin.ts";
import type moment from "moment";

export const plugin: IUtcOnlyDeterministicPlugin<moment.Moment> = new DeterministicPlugin();
