# Writing a Custom Addon

A package exports an **addon-builder**: something that knows how to build an
addon, matching `IAddonBuilder<TAddon>` from `@time-provider/core`:

```ts
interface IAddonBuilder<TAddon extends IAddon<unknown> = IAddon<unknown>> {
  create(): TAddon;
}
```

`.use(...)` calls `create()` once, at Time-Provider creation time — not when
composed — so an addon-builder can accumulate configuration between `.use(...)`
and `.create()` (see [Extending the builder chain](#extending-the-builder-chain)
below).

`TAddon` is what `create()` returns, matching `IAddon<TDate>`:

```ts
interface IAddon<TDate> extends IDisposable {
  get runtime(): IRuntime<TDate>;
  applyToRuntime<TRuntime extends IRuntime<TDate>>(runtime: TRuntime): void;
}
```

## The addon itself

`applyToRuntime` adds a new property to the runtime — typically via
`AddonHelper.extendRuntimeWithProperty` from `@time-provider/core`. Declare the
shape your addon contributes once, alongside the facade interface it points
at, and export both:

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

```ts
import { AddonBase, AddonHelper, type IRuntime } from "@time-provider/core";

class Greeting<TDate> extends AddonBase<TDate> implements IGreetingApi, WithGreetingApi {
  #isDisposed = false;

  get greeting(): IGreetingApi {
    return this;
  }

  applyToRuntimeImpl(runtime: IRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(runtime, "greeting", this);
  }

  dispose(): void {
    this.#isDisposed = true;
  }
  get isDisposed(): boolean {
    return this.#isDisposed;
  }
  [Symbol.dispose](): void {
    this.dispose();
  }

  greet(): string {
    return "hello";
  }
}
```

The helper defines the property as enumerable but non-writable and
non-configurable, so nothing downstream can swap the facade out and a second
addon claiming the same name fails rather than replacing the first.

Note the `IRuntime<TDate>` constraint: an addon is handed the runtime, not the
narrower `ITimeProvider` facade a consumer holds. That's what gives it typed
access to everything a runtime carries beyond the four public facades — the
[cron addon](/addons/cron) reads `runtime.calendarScheme` this way, which is
how the same cron syntax describes whatever calendar the plugin uses. Both
cron and [ETA](/addons/eta) also build on `runtime.timers`, which is what
makes their callbacks follow the [clock strategy](/guide/clock-strategies)
instead of the real event loop.

## The addon-builder

Export a **factory function** returning a fresh addon-builder — not a shared
singleton. Each call to `.use(addon)` then gets its own instance, so
configuring one composition (see below) never leaks into another:

```ts
import type { IAddonBuilder } from "@time-provider/core";

export function addon<TDate>(): IAddonBuilder<Greeting<TDate>> {
  return { create: () => new Greeting<TDate>() };
}
export default addon;
```

A plain object literal is enough when there's no configuration to hold — that
is the shape `@time-provider/addon-cron`, `@time-provider/addon-eta`, and
`@time-provider/addon-compat` use. Compose it with
`createTimeProvider.for(plugin).use(addon)`.

## Two entry points

Like `core` itself, an addon-builder is split into a system half and a
deterministic half (see [Mental Model](/guide/mental-model)) —
`IAddonBuilder` typed against `ISystemAddon<TDate>` on the system side,
`IDeterministicAddon<TDate>` (from `@time-provider/core/deterministic`) on the
deterministic one.

The two halves only need separate implementations when the behavior differs.
An addon that reads time with `runtime.clock.timestampNow()` and schedules on
`runtime.timers` already follows the clock strategy, so it can write the
factory once, in a shared `addon.ts`, and re-export it under both entry
points — the shape `@time-provider/addon-cron` and `@time-provider/addon-eta`
use:

```ts
// addon.ts
import type { IAddonBuilder } from "@time-provider/core";
import { Greeting } from "./greeting.ts";

export function addon<TDate>(): IAddonBuilder<Greeting<TDate>> {
  return { create: () => new Greeting<TDate>() };
}
```

```ts
// index.ts
export { addon } from "./addon.ts";
export default addon;
```

```ts
// deterministic.ts
export { addon } from "./addon.ts";
export default addon;
```

`@time-provider/addon-animation-frame` is the case that needs two: its system
half hands work to the host's `requestAnimationFrame`, its deterministic half
simulates frames against the runtime's own clock.

## Extending the builder chain

Beyond `create`, an addon-builder's own enumerable properties are spliced onto
the runtime-builder by `.use(...)`. That is how
`@time-provider/addon-animation-frame` contributes
[`.withHostFramesRate(...)`](/addons/animation-frame#simulated-frames):
config methods called _after_ `.use(...)` mutate the same addon-builder
`.use(...)` stored, and `create()` — called later, at `.create()` time — reads
that configuration:

```ts
export interface IGreetingBuilderExtra {
  withGreetingName<TBuilder>(this: TBuilder, name: string): TBuilder;
}

// A closure, not a class field: `.use()` splices `withGreetingName` onto the runtime-builder
// chain, so it actually runs with the runtime-builder as `this`, not this addon-builder - a
// private class field wouldn't be reachable from there, but a closed-over variable still is.
export function addon<TDate>(): IAddonBuilder<Greeting<TDate>> & IGreetingBuilderExtra {
  let greetingName: string | undefined;
  return {
    withGreetingName<TBuilder>(this: TBuilder, name: string): TBuilder {
      greetingName = name;
      return this;
    },
    create(): Greeting<TDate> {
      return new Greeting<TDate>(greetingName);
    },
  };
}
```

```ts
createTimeProvider.for(plugin).use(addon).withGreetingName("Ada").create();
```

`.use(...)` throws if a spliced-in name is already present on the builder, so a
method that would shadow an existing builder member fails at composition
instead of silently taking its place.

For a complete worked example, read the built-in addons' source: the
[`@time-provider/addon-animation-frame` source](https://github.com/jaenyf/time-provider/tree/main/packages/addon-animation-frame/src)
covers two different entry points and a configurable builder, and
[`@time-provider/addon-cron`](https://github.com/jaenyf/time-provider/tree/main/packages/addon-cron/src)
the shared-factory shape.
