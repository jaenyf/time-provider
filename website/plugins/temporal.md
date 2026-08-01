# Temporal

```bash
npm install @time-provider/core @time-provider/plugin-temporal
```

Node.js and browsers don't ship the TC39 `Temporal` proposal natively yet,
so `plugin-temporal` assumes a global `Temporal` is already available —
seed it once at your app's/test's entry point with
[`@js-temporal/polyfill`](https://www.npmjs.com/package/@js-temporal/polyfill)
until it lands natively:

```ts
import { Temporal } from "@js-temporal/polyfill";
if (!("Temporal" in globalThis)) {
  (globalThis as { Temporal?: unknown }).Temporal = Temporal;
}
```

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-temporal";

const timeProvider = createTimeProvider.for(plugin).withTimezone("Australia/Sydney").create();

timeProvider.clock.utcNow(); // Temporal.ZonedDateTime, in UTC
timeProvider.clock.localNow(); // Temporal.ZonedDateTime, in Australia/Sydney
```

```ts
// tests — same date type, from the /deterministic subpath
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-temporal/deterministic";

const timeProvider = createTimeProvider.for(plugin).asFixed().withFixedTime(0).create();
```

- **Date type:** `Temporal.ZonedDateTime`.
- **Peer dependency:** none declared — bring your own global `Temporal`
  (native once browsers/Node ship it, or `@js-temporal/polyfill` today).
- **Timezone support:** full — `ISystemPlugin`/`ITimeProvider` (or
  `IDeterministicPlugin` on the `/deterministic` side), real IANA zones,
  natively part of `Temporal.ZonedDateTime`.

The [Playground](/playground) polyfills `Temporal` this same way before
loading this plugin.
