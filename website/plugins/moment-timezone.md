# Moment.js + moment-timezone

```bash
npm install @time-provider/core @time-provider/plugin-moment-timezone
```

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-moment-timezone";

const timeProvider = createTimeProvider.for(plugin).withTimezone("Europe/Paris").create();

timeProvider.clock.utcNow(); // moment.Moment, in UTC
timeProvider.clock.localNow(); // moment.Moment, in Europe/Paris
```

```ts
// tests — same date type, from the /deterministic subpath
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-moment-timezone/deterministic";

const timeProvider = createTimeProvider.for(plugin).asFixed().withFixedTime(0).create();
```

- **Date type:** `moment.Moment` (same as plain Moment.js).
- **Peer dependencies:** `moment` and `moment-timezone`.
- **Timezone support:** full — `ISystemPlugin`/`ITimeProvider` (or
  `IDeterministicPlugin` on the `/deterministic` side), real IANA zones via
  `moment-timezone`'s bundled data.

Pick this over [plain `plugin-moment`](/plugins/moment) whenever you need
`.withTimezone(...)`/`clock.localNow()` and can afford
`moment-timezone`'s extra bundle size.
