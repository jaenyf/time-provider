import { describe, expect, test } from "vite-plus/test";
import { createTimeProvider } from "../../core/dist/deterministic.mjs";
import { plugin } from "../../plugin-native/dist/deterministic.mjs";
import { addon as addonCron } from "../../addon-cron/dist/deterministic.mjs";
import { addon as addonEta } from "../../addon-eta/dist/deterministic.mjs";

//other e2e tests (using e2e-helper) will be loaded by the test runner
//this file is just a quick test playground, and avoid carying an empty file
//tests here are not loaded by the test runner (because of the missing test.ts extension)

describe("e2e", () => {
  describe("general", () => {
    test("basic assertion", () => {
      using tp = createTimeProvider.for(plugin).use(addonCron).use(addonEta).asManual().create();
      expect(tp.clock.utcNow()).not.toBeDefined();
    });
  });
});
