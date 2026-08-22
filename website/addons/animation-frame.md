# Animation Frames

[`@time-provider/addon-animation-frame`](https://www.npmjs.com/package/@time-provider/addon-animation-frame)
adds an `.animation` facade over
`requestAnimationFrame`/`cancelAnimationFrame`, backed by the host's real
display refresh on a system Time-Provider and by simulated frames on a
deterministic one. Like every [addon](/addons/) it composes in with
`.use(addon)` and ships two entry points:

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-animation-frame";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

const handle = timeProvider.animation.requestAnimationFrame(() => draw());
timeProvider.animation.cancelAnimationFrame(handle);
```

`requestAnimationFrame` matches the native contract: it fires **once**, not
repeatedly. Call it again from inside the callback to keep animating.
`cancelAnimationFrame` is a no-op if the frame already ran or was already
cancelled. The handle is an `AnimationFrameHandle`, the same type the host's
native `requestAnimationFrame` returns.

## Simulated frames

On a deterministic Time-Provider, frames are simulated against the runtime's own
clock: a registered callback fires once "now" has moved forward by at least one
frame duration. So a whole animation plays out inside `advance()`, with no real
waiting and no dependence on a display:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-animation-frame/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .withHostFramesRate(90) // simulate 90 FPS instead of the default 60
  .asManual()
  .withInitialTime(0)
  .create();

let frames = 0;
const tick = () => {
  frames++;
  timeProvider.animation.requestAnimationFrame(tick);
};
timeProvider.animation.requestAnimationFrame(tick);

timeProvider.clock.advance({ milliseconds: 100 }); // ~9 frames at 90 FPS
```

`.withHostFramesRate(rate)` is contributed by the deterministic addon and
chains directly off `.use(addon)`, before you pick a strategy. It defaults to
`60` and throws on a rate that is zero or negative.

## Where the API isn't available

The system addon constructs its timer eagerly and **throws** if the host has
no `requestAnimationFrame`/`cancelAnimationFrame` — plain Node.js, for instance.
That surfaces at `.create()`, not at the first frame request. The deterministic
addon never touches the host API, so it works everywhere, which is what makes
animation logic testable off a browser.

## Composing two independently configured instances

The exported `addon` is a shared singleton, and composing it clones itself so
two Time-Providers never share state. When you need two instances configured
_differently_ — two frame rates in the same test file — call `createAddon()`
from the deterministic entry point for a fresh one:

```ts
import { createAddon } from "@time-provider/addon-animation-frame/deterministic";

const fast = createAddon().withHostFramesRate(120);
const slow = createAddon().withHostFramesRate(24);
```

## The types

Inference covers ordinary use. If you need to write a type down, the addon
exports `AnimationFrameHandle`, `IAnimationFrameApi` (the `.animation`
facade), and `WithAnimationFrameApi` for naming a Time-Provider with this addon
composed in:

```ts
import type {
  IAnimationFrameApi,
  WithAnimationFrameApi,
} from "@time-provider/addon-animation-frame";

function animate(tp: ITimeProvider<Date> & WithAnimationFrameApi) {
  tp.animation.requestAnimationFrame(() => {});
}
```

The implementation classes are exported too, for the rare case of building a
facade outside the addon pipeline: `SystemAnimationFrameScheduler` from the
root entry point, and `DeterministicAnimationFrameScheduler` from
`/deterministic`, which takes the runtime's `ITimers` and exposes a readable
and writable `hostFramesRate`.
