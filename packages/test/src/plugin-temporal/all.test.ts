import { describe } from "vite-plus/test";
import { testAll } from "@time-provider/test-shared";
import { plugin } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";

/*
 * plugin-temporal assumes a global `Temporal` is already available.
 * Node/Bun don't ship Temporal natively yet, so this seeds it for the monorepo's own test run only
 */
if (!("Temporal" in globalThis)) {
  (globalThis as { Temporal?: unknown }).Temporal = Temporal;
}

describe("plugin-temporal", () => {
  testAll<Temporal.ZonedDateTime>(plugin);
});
