[![NPM](https://img.shields.io/npm/v/@time-provider%2Faddon-eta.svg)](https://www.npmjs.com/package/@time-provider/addon-eta)
[![types](https://img.shields.io/npm/types/@time-provider/addon-eta)](https://www.npmjs.com/package/@time-provider/addon-eta?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/addon-eta)](https://www.npmjs.com/package/@time-provider/addon-eta)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/addon-eta?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/addon-eta)](https://www.npmjs.com/package/@time-provider/addon-eta)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/addon-eta)](https://www.npmjs.com/package/@time-provider/addon-eta)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/addon-eta)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ ETA Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the ETA (estimated time of arrival) addon for
[Time-Provider](https://www.npmjs.com/package/@time-provider/core). Extends the library with an
`.eta` facade that periodically reports progress and a projected completion time for a long-running task.

Three mutually exclusive ways to start a schedule:

- **`withKnownTotal(total)`** - report progress toward a single known total (bytes downloaded,
  rows processed, ...). The completion rate is estimated from reported progress over time, and the
  ETA is projected from that rate.
- **`withStages(stages)`** - the same idea across several weighted stages of one job (e.g.
  download, then process, then finalize), reported as a single overall schedule.
- **`withEstimatedDuration(expectedDurationMilliseconds)`** - no progress signal at all, just a
  rough prior of how long the job usually takes. The ETA is
  `startTime + expectedDurationMilliseconds`, fixed for the life of the schedule.

Progress reporting (`progress()`/`progressTo()`) is pure, O(1) bookkeeping - it never triggers a
notification by itself. Notifications are delivered strictly on the configured interval
(`withNotificationInterval`, defaulting to 1000ms), decoupling how often progress is reported from
how often a consumer is notified.

Just like the plugin packages, this addon is tree-shakable.  
It is split into a default (system/real-time) entry point and a deterministic one, so each import
pulls in only the code it needs:

- `@time-provider/addon-eta` - for a **system** (real time) Time-Provider created via
  `@time-provider/core`. Notifications run on real native timers.
- `@time-provider/addon-eta/deterministic` - for a **deterministic** Time-Provider
  (fixed/manual/sequential) created via `@time-provider/core/deterministic`. Notifications run
  against that runtime's own simulated clock.

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-eta";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

const tracker = timeProvider.eta
  .estimate()
  .withKnownTotal(1_000_000) // bytes
  .withNotificationInterval(500)
  .start((snapshot) => {
    console.log(`${snapshot.percentage.toFixed(1)}% - ETA ${snapshot.eta}`);
  });

tracker.progress(65_536); // a chunk just arrived
// ...
tracker.done(); // one final notification, snapped to 100%
```

## Multi-stage schedules

`withStages` tracks several stages of one job as a single overall schedule. Each stage declares
its own `total` (in whatever unit fits that stage - bytes, then rows, then steps) and a `weight`
relative to the other stages, normalized by dividing by their sum (not required to sum to any
particular total):

```ts
const tracker = timeProvider.eta
  .estimate()
  .withStages([
    { weight: 2, total: downloadBytes }, // twice as significant as what follows
    { weight: 1, total: processRows },
  ])
  .start((snapshot) => {
    // stageCompleted/stageTotal/stagePercentage are local to the current stage (its own unit) -
    // a per-stage progress bar. rate/eta/remainingMilliseconds are overall, weighted across every
    // stage.
    console.log(`stage ${snapshot.currentStageIndex + 1}/${snapshot.stageCount}`);
  });

tracker.progressTo(downloadBytes); // finish the download stage
tracker.nextStage(); // move on to processing, progress resets to 0
tracker.progress(1);
```

Different stages can use different raw units, which can't be meaningfully summed into one figure -
so a staged snapshot's fields deliberately don't share names with a non-staged one:
`stageCompleted`/`stageTotal`/`stageRemaining`/`stagePercentage` stay local to whichever stage is
current, while `rate`/`eta`/`remainingMilliseconds` are weighted across every stage
(unit-less/normalized figures, which _can_ be combined), answering "when does the whole job
finish" rather than just the current stage.

## Estimating a completion rate

`withAlgorithm` picks how the completion rate is derived from reported progress (defaults to
`"windowed"`):

- `"complete"` - averaged over the entire tracked history, from the start. Simple and stable, but
  a slow start (or a mid-run change of pace) permanently drags the estimate.
- `"windowed"` - averaged over only the most recently reported progress, discarding older samples.
  Reacts to a change in pace faster than `"complete"`.
- `"smoothed"` - a continuously blended running average, weighted toward more recent reports
  without discarding older ones outright.

`rate` itself is always a fraction of the whole job (0-1) per millisecond, never scaled to the
tracked unit - that's what lets a multi-stage schedule combine stages using different units into
one figure.

## Ending a schedule

- **`done()`** - marks the job complete. The final notification reports 100% regardless of the
  last reported amount, and no further notifications follow.
- **`abandon()`** - calls off tracking without completing it. The final notification reports
  whatever progress was last recorded, as-is, with `eta`/`remainingMilliseconds` unset - there's
  nothing left to project forward. `rate` stays set to the last measured pace.

Both are idempotent: calling either again after a schedule has already ended is a no-op.

## License

MIT
