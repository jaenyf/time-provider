# Writing a Custom Addon

An addon is a plain object matching `ISystemAddon<TDate, TExtra>`
(or `IDeterministicAddon<TDate, TExtra>` on the deterministic
side) from `@time-provider/core`:

```ts
interface ISystemAddon<TDate, TExtra> {
  applyToRuntime<TRuntime extends IRuntime<TDate>>(runtime: TRuntime): TRuntime & TExtra;
  clone(): ISystemAddon<TDate, TExtra>;
}
```

`TExtra` is the shape your addon contributes — the property it adds to the
Time-Provider and nothing else. Declare it once, alongside the facade
interface it points at, and export both:

```ts
export interface IGreetingApi {
  greet(): string;
}

export type WithGreetingApi = {
  greeting: IGreetingApi;
};
```

Every built-in addon names that shape `With<Something>Api` —
`WithAnimationFrameApi`, `WithCronApi`, `WithEtaApi` — because it is what
consumers write when they need to name a Time-Provider with the addon
composed in.

## applyToRuntime

`applyToRuntime` adds the new property to the runtime — typically via
`AddonHelper.extendRuntimeWithProperty` from `@time-provider/core`:

```ts
import { AddonHelper, type ISystemAddon } from "@time-provider/core";

function createAddon<TDate>(): ISystemAddon<TDate, WithGreetingApi> {
  return {
    applyToRuntime(runtime) {
      return AddonHelper.extendRuntimeWithProperty(
        runtime,
        "greeting",
        new SystemGreeting(runtime.clock),
        undefined as unknown as WithGreetingApi,
      );
    },
    clone(): ISystemAddon<TDate, WithGreetingApi> {
      return createAddon<TDate>();
    },
  };
}

export const addon: ISystemAddon<unknown, WithGreetingApi> = createAddon();
export default addon;
```

The helper defines the property as enumerable but non-writable and
non-configurable, so nothing downstream can swap the facade out and a second
addon claiming the same name fails rather than replacing the first. Its fourth
argument exists only to carry `TExtra` at the type level — it is never read at
runtime, hence the `undefined as unknown as ...` every built-in addon passes.

Note the `IRuntime<TDate>` constraint: an addon is handed the runtime, not the
narrower `ITimeProvider` facade a consumer holds. That's what gives it typed
access to everything a runtime carries beyond the four public facades — the
[cron addon](/addons/cron) reads `runtime.calendarScheme` this way, which is
how the same cron syntax describes whatever calendar the plugin uses. Both
cron and [ETA](/addons/eta) also build on `runtime.scheduler`, which is what
makes their callbacks follow the [clock strategy](/guide/clock-strategies)
instead of the real event loop.

## clone

`.use(addon)` clones before it composes, so the exported singleton is never the
instance a Time-Provider ends up holding. Return a fresh instance from
`clone()` and carry over whatever configuration the addon has accumulated —
that is what keeps two Time-Providers built from the same singleton from
sharing state.

## Two entry points

Like `core` itself, an addon is split into a system half and a deterministic
half (see [Mental Model](/guide/mental-model)) — `ISystemAddon` imported from
`@time-provider/core`, `IDeterministicAddon` from
`@time-provider/core/deterministic`.

The two halves only need separate implementations when the behavior differs. An
addon that reads time with `runtime.clock.timestampNow()` and
schedules on `runtime.scheduler` already follows the clock strategy, so it can
write the factory once and re-export the same singleton under both types — the
shape `@time-provider/addon-cron` and `@time-provider/addon-eta` use:

```ts
// index.ts
import type { ISystemAddon } from "@time-provider/core";
import { addon as sharedAddon } from "./addon.ts";

export const addon: ISystemAddon<unknown, WithGreetingApi> = sharedAddon;
export default addon;
```

```ts
// deterministic.ts
import type { IDeterministicAddon } from "@time-provider/core/deterministic";
import { addon as sharedAddon } from "./addon.ts";

export const addon: IDeterministicAddon<unknown, WithGreetingApi> = sharedAddon;
export default addon;
```

`@time-provider/addon-animation-frame` is the case that needs two: its system
half hands work to the host's `requestAnimationFrame`, its deterministic half
simulates frames against the runtime's own clock.

## Extending the builder chain

Beyond `applyToRuntime` and `clone`, an addon's own enumerable properties are
spliced onto the builder by `.use(...)`. That is how
`@time-provider/addon-animation-frame` contributes
[`.withHostFramesRate(...)`](/addons/animation-frame#simulated-frames).
Declare those methods in their own interface and intersect it with the addon
type:

```ts
export interface IGreetingBuilderExtra {
  withGreetingName<TBuilder>(this: TBuilder, name: string): TBuilder;
}

export function createAddon<TDate>(): IDeterministicAddon<TDate, WithGreetingApi> &
  IGreetingBuilderExtra {
  let greetingName: string | undefined;
  return {
    applyToRuntime(runtime) {
      /* ... reads greetingName ... */
    },
    withGreetingName<TBuilder>(this: TBuilder, name: string): TBuilder {
      greetingName = name;
      return this;
    },
    clone(): IDeterministicAddon<TDate, WithGreetingApi> {
      const cloned = createAddon<TDate>();
      if (greetingName !== undefined) {
        cloned.withGreetingName(greetingName);
      }
      return cloned;
    },
  };
}
```

The generic `this` parameter is what keeps the chain intact: the method returns
the builder it was spliced onto, with that builder's own type, so the rest of
the chain still type-checks after it. Note the `clone()` above copying
`greetingName` over — configuration set on the singleton before composition
would otherwise be dropped by the clone `.use(...)` takes.

`.use(...)` throws if a spliced-in name is already present on the builder, so a
method that would shadow an existing builder member fails at composition
instead of silently taking its place.

Because that configuration lives on the addon instance rather than the builder,
export the factory next to the singleton. Two instances configured differently
then coexist in the same file:

```ts
import { createAddon } from "@time-provider/addon-animation-frame/deterministic";

const fast = createAddon().withHostFramesRate(120);
const slow = createAddon().withHostFramesRate(24);
```

Export the composed singleton as `addon` — as a named export and as the default
— matching every built-in addon, so it drops straight into `.use(addon)`.

For a complete worked example, read the built-in addons' source: the
[`@time-provider/addon-animation-frame` source](https://github.com/jaenyf/time-provider/tree/main/packages/addon-animation-frame/src)
covers two different entry points, and
[`@time-provider/addon-cron`](https://github.com/jaenyf/time-provider/tree/main/packages/addon-cron/src)
the shared-factory shape.
