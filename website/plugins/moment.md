# Moment.js

```bash
npm install @time-provider/core @time-provider/plugin-moment
```

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-moment";

const timeProvider = createTimeProvider.for(plugin).create();
timeProvider.clock.utcNow(); // moment.Moment, in UTC
```

```ts
// tests — same date type, from the /deterministic subpath
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-moment/deterministic";

const timeProvider = createTimeProvider.for(plugin).asFixed().withFixedTime(0).create();
```

- **Date type:** `moment.Moment`.
- **Peer dependency:** `moment`.
- **Timezone support:** UTC-only. `IUtcOnlySystemPlugin`/`IUtcOnlyTimeProvider`
  (or `IUtcOnlyDeterministicPlugin` on the `/deterministic` side) — plain
  Moment.js has no IANA timezone database bundled, so `clock` has no
  `localNow()`/`withTimezone()`/`hostTimezone()`.

Need real local time with Moment's API? Use
[Moment.js + moment-timezone](/plugins/moment-timezone) instead — same date
type, full timezone support.
