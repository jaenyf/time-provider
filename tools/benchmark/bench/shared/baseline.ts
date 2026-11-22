import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type * as Kit from "./adapters/kit.ts";

export type TimeProviderKit = typeof Kit;

/** Appended to a Time-Provider adapter's name when it runs on the baseline build. */
export const BASELINE_SUFFIX = " [baseline]";

const directory = process.env.TIMEPROVIDER_BENCH_BASELINE;

/** The baseline build prepared by gate.ts, or undefined outside the gate. */
export const baselineKit: TimeProviderKit | undefined = directory
  ? await import(pathToFileURL(join(directory, "kit.mjs")).href)
  : undefined;
