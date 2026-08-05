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

## Which timezone database wins

`moment-timezone` ships its own copy of the IANA database, which you pin and
update on your own schedule. Every other plugin here reads the host engine's
ICU data instead, which updates when the engine does. The two can disagree for
zones whose rules changed recently — Morocco's Ramadan DST shifts, for example,
or the Canadian permanent-DST proposals.

This plugin resolves wall-clock times through `moment-timezone`'s data, so a
`.withTimezone(...)` reading — and any [cron schedule](/guide/cron) built on it
— matches the rest of your `moment-timezone` code rather than the engine. Which
version of the database is in play is therefore the one you installed, exactly
as it is everywhere else you call `moment.tz(...)`.
