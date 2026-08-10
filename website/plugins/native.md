# Native Date

[`@time-provider/plugin-native`](https://www.npmjs.com/package/@time-provider/plugin-native)

```bash
npm install @time-provider/core @time-provider/plugin-native
```

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

const timeProvider = createTimeProvider.for(plugin).create();
timeProvider.clock.utcNow(); // Date
```

```ts
// tests — same date type, from the /deterministic subpath
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

const timeProvider = createTimeProvider.for(plugin).asFixed().withFixedTime(0).create();
```

- **Date type:** the built-in `Date`.
- **Peer dependency:** none — works with plain JavaScript, no extra install.
- **Timezone support:** UTC-only. `IUtcOnlySystemPlugin`/`IUtcOnlyTimeProvider`
  (or `IUtcOnlyDeterministicPlugin` on the `/deterministic` side) — `clock`
  has no `localNow()`, `withTimezone()`, or `hostTimezone()`, because native
  `Date` has no IANA-timezone-aware representation.

The best default when your codebase has no other date library dependency
and doesn't need real local-time rendering.
