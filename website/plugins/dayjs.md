# Day.js

```bash
npm install @time-provider/core @time-provider/plugin-dayjs
```

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-dayjs";

const timeProvider = createTimeProvider.for(plugin).withTimezone("America/New_York").create();

timeProvider.clock.utcNow(); // dayjs.Dayjs, in UTC
timeProvider.clock.localNow(); // dayjs.Dayjs, in America/New_York
```

```ts
// tests — same date type, from the /deterministic subpath
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-dayjs/deterministic";

const timeProvider = createTimeProvider.for(plugin).asFixed().withFixedTime(0).create();
```

- **Date type:** `dayjs.Dayjs`.
- **Peer dependency:** `dayjs` (the plugin itself extends it with
  `dayjs/plugin/utc` and `dayjs/plugin/timezone`).
- **Timezone support:** full — `ISystemPlugin`/`ITimeProvider` (or
  `IDeterministicPlugin` on the `/deterministic` side), real IANA zones via
  `.withTimezone(...)`/`clock.localNow()`.

Pick this if your codebase already uses Day.js for its small footprint and
Moment-like API.
