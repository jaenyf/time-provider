# Addons

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
`parser`, `scheduler`, `performance` — plus whatever the addon adds, here an
`.animation` facade exposing `requestAnimationFrame`/`cancelAnimationFrame`.

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

On a system Time-Provider, `@time-provider/addon-animation-frame`'s
`.animation` passes through to the real `requestAnimationFrame`/
`cancelAnimationFrame` (or throws a clear error where neither exists, e.g.
plain Node.js). On a deterministic one, frames are simulated against that
runtime's own clock instead — a registered callback fires once the
runtime's own "now" has moved forward by at least one simulated frame
duration, configurable via `.withHostFramesRate(...)` chained right after
`.use(...)`:

```ts
const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .withHostFramesRate(90) // now simulating 90 FPS
  .asManual()
  .withInitialTime(0)
  .create();
```

## Available addons

- `@time-provider/addon-animation-frame` — an `.animation` facade over
  `requestAnimationFrame`/`cancelAnimationFrame`, described above.
- `@time-provider/addon-cron` — a `.cron` facade running callbacks on cron
  schedules, in the runtime's own timezone. See
  [Cron Schedules](/guide/cron).

## Writing a custom addon

An addon is a plain object matching `ISystemAddon<TDate, TExtra>`
(or `IDeterministicAddon<TDate, TExtra>` on the deterministic
side) from `@time-provider/core`:

```ts
interface ISystemAddon<TDate, TExtra> {
  applyToRuntime<TRuntime extends ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>>(
    runtime: TRuntime,
  ): TRuntime & TExtra;
  clone(): ISystemAddon<TDate, TExtra>;
}
```

`applyToRuntime` adds the new property to the runtime — typically via
`AddonHelper.extendRuntimeWithProperty` from `@time-provider/core`, which
defines it as non-writable and non-configurable — and `clone()` returns a
fresh instance so composing the same addon with two different
Time-Providers never shares state between them. See the
[`@time-provider/addon-animation-frame` source](https://github.com/jaenyf/time-provider/tree/main/packages/addon-animation-frame/src)
for a complete, worked example of both entry points.
