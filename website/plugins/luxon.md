# Luxon

```bash
npm install @time-provider/core @time-provider/plugin-luxon
```

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-luxon";

const timeProvider = createTimeProvider.for(plugin).withTimezone("Asia/Tokyo").create();

timeProvider.clock.utcNow(); // Luxon DateTime, in UTC
timeProvider.clock.localNow(); // Luxon DateTime, in Asia/Tokyo
```

```ts
// tests — same date type, from the /deterministic subpath
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-luxon/deterministic";

const timeProvider = createTimeProvider.for(plugin).asFixed().withFixedTime(0).create();
```

- **Date type:** Luxon's `DateTime`.
- **Peer dependency:** `luxon`.
- **Timezone support:** full — `ISystemPlugin`/`ITimeProvider` (or
  `IDeterministicPlugin` on the `/deterministic` side), real IANA zones
  natively supported by Luxon.

Pick this if your codebase already uses Luxon for its immutable,
timezone-first API.
