---
aside: false
---

# 1. Swap the Globals

Moving a codebase onto Time-Provider takes three steps, and you can ship after
each one:

1. **Swap the globals**: prefix `setTimeout`, `performance.now()` and friends
   with `timeProvider.compat.`, arguments unchanged.
2. **[Use the Time-Provider API](/migration/time-provider-api)**: rewrite each
   compat call, and each `Date.now()`, to the library's own API.
3. **[Inject the Time-Provider](/migration/injection)**: have your code receive
   the Time-Provider, so a test can hand it a clock it controls.

## Find the call sites

```bash
grep -rnE "\b(set|clear)(Timeout|Interval)\(|queueMicrotask\(|(request|cancel)(AnimationFrame|IdleCallback)\(|performance\.|Date\.now\(|new Date\(\)" src
```

## Create one Time-Provider

```bash
npm install @time-provider/core @time-provider/plugin-native @time-provider/addon-compat
```

```ts
// time-provider.ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-compat";

export const timeProvider = createTimeProvider.for(plugin).use(addon).create();
```

Pick the [plugin](/plugins/) matching the date library you already use.

## Prefix the calls

<div class="tp-compare">
<div>

**Before**

```ts
const poll = setInterval(refresh, 30_000);
const start = performance.now();

setTimeout(() => {
  clearInterval(poll);
  report(performance.now() - start);
}, 60_000);
```

</div>
<div>

**After**

<!-- prettier-ignore -->
```ts
import { timeProvider } from "./time-provider";

const poll = timeProvider.compat.setInterval(refresh, 30_000);
const start = timeProvider.compat.now();

timeProvider.compat.setTimeout(() => {
  timeProvider.compat.clearInterval(poll);
  report(timeProvider.compat.now() - start);
}, 60_000);
```

</div>
</div>

Everything the [compat addon](/addons/compat) covers:

| Global                                                                                     | Compat                                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`, `queueMicrotask`             | `timeProvider.compat.<same name>`                                                                       |
| `performance.now()`, `.timeOrigin`, `.mark()`, `.measure()`, `.getEntries*()`, `.clear*()` | `timeProvider.compat.<same name>`                                                                       |
| `requestAnimationFrame`, `cancelAnimationFrame`                                            | `timeProvider.compat.<same name>`, with [`addon-animation-frame`](/addons/animation-frame) composed too |
| `requestIdleCallback`, `cancelIdleCallback`                                                | `timeProvider.compat.<same name>`, with [`addon-idle`](/addons/idle) composed too                       |

## What changes

- `set*` and `request*` return an `IScheduledHandle` object, not a number.
  Pass it to the matching `clear*` or `cancel*` as before.
- Arguments after the delay are not forwarded: `setTimeout(fn, 100, a)`
  becomes `compat.setTimeout(() => fn(a), 100)`.
- Compose the compat addon before `addon-animation-frame` and `addon-idle`,
  or their methods are missing from `.compat`.
- `Date` has no compat equivalent. Each plugin returns its own date type (a
  `Date`, a Day.js object, a Luxon `DateTime`...), so dates move straight to
  the clock in [step 2](/migration/time-provider-api#dates).

## Keep migrated files clean

An ESLint rule on the folders you have migrated stops new native calls from
slipping back in:

```js
// eslint.config.js
export default [
  {
    files: ["src/billing/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "queueMicrotask",
        "performance",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "requestIdleCallback",
        "cancelIdleCallback",
      ],
    },
  },
];
```

Widen `files` as the migration moves along.
