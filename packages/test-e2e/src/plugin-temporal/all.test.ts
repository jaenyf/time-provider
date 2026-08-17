import { describe } from "vite-plus/test";
import { plugin as systemPlugin } from "../../../plugin-temporal/dist/index.mjs";
import { plugin as deterministicPlugin } from "../../../plugin-temporal/dist/deterministic.mjs";
import { E2eHelper } from "../e2e-helper.ts";
import { Temporal } from "@js-temporal/polyfill";

/*
 * plugin-temporal assumes a global `Temporal`.
 * Shim it for Node because it don't ship it natively yet.
 */
if (!("Temporal" in globalThis)) {
  (globalThis as { Temporal?: unknown }).Temporal = Temporal;
}

describe("e2e temporal", () => {
  E2eHelper.e2eTests(
    systemPlugin,
    deterministicPlugin,
    () => Temporal.Now.instant().toString(),
    (time) => time.toString(),
    (time) => time.epochMilliseconds,
  );
});
