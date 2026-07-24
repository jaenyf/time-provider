import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin as systemPlugin } from "@time-provider/plugin-temporal";
import { plugin as deterministicPlugin } from "@time-provider/plugin-temporal/deterministic";
import { Temporal } from "@js-temporal/polyfill";

/*
 * plugin-temporal assumes a global `Temporal` is already available.
 * Node/Bun don't ship Temporal natively yet, so this seeds it for the monorepo's own test run only
 */
if (!("Temporal" in globalThis)) {
  (globalThis as { Temporal?: unknown }).Temporal = Temporal;
}

describe("plugin-temporal", () => {
  testAll<Temporal.ZonedDateTime>(systemPlugin, deterministicPlugin);
});
