// The global Temporal snippet documented in the plugin-temporal README for TypeScript 5.
import type { Temporal as Polyfill } from "@js-temporal/polyfill";

declare global {
  namespace Temporal {
    type ZonedDateTime = Polyfill.ZonedDateTime;
  }
}
