# Addons (Extensions) — Overview

A **plugin** only ever bridges a date library into the `ITimeProvider`
pipeline — it adds no new functionality. An **addon** extends the
Time-Provider a builder produces with an extra property, composed in with
`.use(addon)` before `.create()` (or before picking a deterministic
strategy):

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-animation-frame";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

timeProvider.animation.requestAnimationFrame(() => console.log("Frame!"));
```

`timeProvider` above is still a plain `ITimeProvider<Date>` — `clock`,
`parser`, `timers`, `performance` — plus whatever the addon adds, here an
`.animation` facade exposing `requestAnimationFrame`/`cancelAnimationFrame`.

| Addon                                              | Property     | Adds                                                                                       | Contributed type        | npm                                                                       |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------- |
| [`addon-animation-frame`](/addons/animation-frame) | `.animation` | `requestAnimationFrame`/`cancelAnimationFrame` — the host's real frames, or simulated ones | `WithAnimationFrameApi` | [npm](https://www.npmjs.com/package/@time-provider/addon-animation-frame) |
| [`addon-cron`](/addons/cron)                       | `.cron`      | callbacks on 5-field cron schedules, read in the runtime's own timezone                    | `WithCronApi`           | [npm](https://www.npmjs.com/package/@time-provider/addon-cron)            |
| [`addon-eta`](/addons/eta)                         | `.eta`       | estimates of when a job finishes, from reported progress or a fixed expected duration      | `WithEtaApi`            | [npm](https://www.npmjs.com/package/@time-provider/addon-eta)             |

Each one peer-depends on `@time-provider/core` and nothing else, so composing
an addon adds no third-party package to your dependency tree.

## Naming the composed type

Inference picks all of that up, so you don't normally write the type down. If
you need to — a parameter in a shared helper, say — each addon exports the
shape it contributes, to intersect with the provider type:

```ts
import type { WithAnimationFrameApi } from "@time-provider/addon-animation-frame";

function animate(tp: ITimeProvider<Date> & WithAnimationFrameApi) {
  tp.animation.requestAnimationFrame(() => {});
}
```

`@time-provider/addon-cron` exports `WithCronApi` and `@time-provider/addon-eta`
exports `WithEtaApi` the same way. Annotating the build site instead would drop
the addon's property, so prefer inference there — see
[Naming these types](/api/clock#naming-these-types).

## Addons are split by entry point too

Just like plugins, an addon that needs to behave differently on a
deterministic clock ships two entry points. Compose the matching addon with
the matching `createTimeProvider`/plugin:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-animation-frame/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .asManual()
  .withInitialTime(0)
  .create();

timeProvider.animation.requestAnimationFrame(() => console.log("Frame!"));
timeProvider.clock.advance({ milliseconds: 20 }); // simulated frame duration elapses
```

`@time-provider/addon-cron` and `@time-provider/addon-eta` behave the same on
both sides — they read time through `clock.timestampNow()` and program timers on
`timeProvider.timers`, so the clock strategy already decides when their
callbacks run. `@time-provider/addon-animation-frame` is the one that differs:
the system half calls the host's `requestAnimationFrame`, the
deterministic half simulates frames against the runtime's own clock.

## Composing more than one

`.use(...)` chains, and each addon contributes its own property:

```ts
import { addon as cron } from "@time-provider/addon-cron";
import { addon as eta } from "@time-provider/addon-eta";

const timeProvider = createTimeProvider.for(plugin).use(cron).use(eta).create();

timeProvider.cron.schedule("0 9 * * *", () => reindex());
timeProvider.eta.estimate();
```

Each `.use(...)` clones the addon it is given, so composing the same exported
singleton with two Time-Providers never shares state between them.

Want a facade of your own? See
[Writing a Custom Addon](/addons/custom).
