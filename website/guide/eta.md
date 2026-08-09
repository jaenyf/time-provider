# ETA Estimates

`@time-provider/addon-eta` adds an `.eta` facade that estimates when a job will
finish and notifies you with a snapshot as it goes. Like every
[addon](/guide/addons) it composes in with `.use(addon)` and ships two entry
points — one for a system Time-Provider, one for a deterministic one:

```ts
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";
import { addon } from "@time-provider/addon-eta";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

const download = timeProvider.eta
  .estimate()
  .withKnownTotal(totalBytes)
  .start((snapshot) => {
    console.log(`${snapshot.percentage.toFixed(1)}% - ${snapshot.remainingMilliseconds}ms left`);
  });

response.on("data", (chunk) => download.progress(chunk.length));
response.on("end", () => download.done());
```

Because notifications run on the Time-Provider's own scheduler, a deterministic
runtime replays a whole job's reporting without waiting for anything:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-eta/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .asManual()
  .withInitialTime(0)
  .create();

const snapshots: number[] = [];
const job = timeProvider.eta
  .estimate()
  .withKnownTotal(100)
  .start((s) => snapshots.push(s.percentage));

job.progress(25);
timeProvider.clock.advance({ seconds: 1 }); // one notification tick fires, in-line
job.progress(25);
timeProvider.clock.advance({ seconds: 1 });

console.log(snapshots); // [25, 50]
```

## Three kinds of estimate

`estimate()` opens a builder, and the branch you pick decides the whole shape
of what follows:

| Call                         | Tracks                                | Snapshot type                |
| ---------------------------- | ------------------------------------- | ---------------------------- |
| `.withKnownTotal(total)`     | progress toward one known total       | `IEtaProgressSnapshot`       |
| `.withStages(stages)`        | progress across weighted stages       | `IStagedEtaProgressSnapshot` |
| `.withEstimatedDuration(ms)` | nothing — a fixed duration you supply | `IEtaDurationSnapshot`       |

The first two are data-driven: you report progress and the `eta` is measured
from the pace you actually achieve. The third reports nothing and gets an `eta`
computed once, up front, from a prior you already have.

All three accept `.withNotificationInterval(ms)` before `.start()` — how often
your callback is invoked, defaulting to `1000` and clamped to `0` if negative.
The two progress-based ones also accept `.withAlgorithm(...)`, below.

`withKnownTotal` throws on a negative total, `withEstimatedDuration` on a
negative duration, and `withStages` on an empty list, a negative weight, or
weights that are all `0`.

## Reporting progress

`.start(notify)` begins the schedule and hands back a tracker:

```ts
const job = timeProvider.eta.estimate().withKnownTotal(500).start(onSnapshot);

job.progress(50); // 50 more units done, relative to the last report
job.progressTo(400); // 400 units done in total, replacing the last report
job.done(); // final snapshot reads 100%, whatever was last reported
job.abandon(); // final snapshot keeps the last progress, with no eta
```

`done()` and `abandon()` both stop the schedule and send exactly one final
snapshot — no notifications follow. The difference is what that snapshot says:
`done()` reports 100% regardless of what you last reported, while `abandon()`
keeps the real progress and leaves `eta`/`remainingMilliseconds` unset, since
there is nothing left to project forward. `rate` stays at the last measured
pace either way. Calling either one twice, or one after the other, is a no-op.

Every snapshot carries a `status` of `"in-progress"`, `"done"` or
`"abandoned"`, so a consumer can tell an ordinary tick from the one final
message a schedule ever sends.

Derived fields (`percentage`, `rate`, `remaining`, `remainingMilliseconds`,
`eta`) are computed lazily, the moment you read them — a callback that only
looks at `eta` never pays to compute the rest.

## Multi-stage jobs

When a job runs through phases with different units — download bytes, then
process rows, then finalize — declare them as weighted stages and report against
whichever is current:

```ts
const job = timeProvider.eta
  .estimate()
  .withStages([
    { weight: 2, total: downloadBytes }, // twice as significant as...
    { weight: 1, total: rowCount }, // ...this one
  ])
  .start((s) => {
    console.log(`stage ${s.currentStageIndex + 1}/${s.stageCount}`);
    console.log(`${s.stagePercentage}% of this stage, eta ${s.eta} for the whole job`);
  });

job.progress(bytesRead);
job.nextStage(); // marks the current stage complete, resets progress to 0
job.progress(rowsProcessed);
job.done();
```

Weights are relative and normalized against their sum, so `{ weight: 2 }` next
to `{ weight: 1 }` says the same thing as `0.66` next to `0.33`.

A staged snapshot deliberately separates the two scopes. `stageCompleted`,
`stageTotal`, `stageRemaining` and `stagePercentage` are local to the current
stage, in that stage's own unit — what a per-stage progress bar wants. `rate`,
`eta` and `remainingMilliseconds` are weighted across every stage and answer
"when does the whole job finish". Units that can't be meaningfully summed are
never summed.

`nextStage()` throws if called on the last stage — call `done()` instead.

## Fixed-duration estimates

With no progress signal at all, supply the duration the job usually takes:

```ts
const job = timeProvider.eta
  .estimate()
  .withEstimatedDuration(30_000)
  .start((s) => console.log(`~${s.remainingMilliseconds}ms left`));

job.done(); // snaps eta to the actual completion time
```

`eta` is `startTime + expectedDuration`, fixed for the schedule's life, until
`done()` snaps it to the real completion time or `abandon()` clears it.

## Which rate algorithm

Progress-based estimates derive a completion rate from your reports, and
`.withAlgorithm(...)` picks how:

| Algorithm              | Behaviour                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `"windowed"` (default) | averages only recent reports, discarding older ones — reacts fastest to a change of pace           |
| `"complete"`           | averages the entire history from the start — stablest, but a slow start drags the estimate forever |
| `"smoothed"`           | an exponentially weighted running average, leaning recent without discarding the past              |

`rate` is a fraction of the whole job (0–1) per millisecond, not the tracked
unit — that is what lets a staged estimate combine stages measured in different
units. It is `undefined`, along with `eta` and `remainingMilliseconds`, until
the chosen algorithm has enough samples to estimate anything.

## Timing comes from the runtime

`.eta` reads time through `clock.timestampNow()` and schedules its ticks on
`timeProvider.scheduler`, which has two consequences worth knowing.

Notifications follow the [clock strategy](/guide/clock-strategies) like any
other timer — real intervals on a system clock, in-line during `advance()` on a
manual clock, and never on a fixed clock, where time doesn't move and nothing
becomes due. And because it reads with `timestampNow()` rather than `utcNow()`,
tracking a job never consumes an instant from a
[sequential clock](/guide/sequential-clock).

## Naming the types

Inference covers the normal cases — `estimate()`, the builders and the trackers
all thread their types through. Everything is exported too, should you need to
write one down:

| Role     | Known total                | Weighted stages                  | Fixed duration             |
| -------- | -------------------------- | -------------------------------- | -------------------------- |
| Builder  | `IProgressEtaTrackBuilder` | `IStagedProgressEtaTrackBuilder` | `IDurationEtaTrackBuilder` |
| Tracker  | `IProgressEtaTracker`      | `IStagedProgressEtaTracker`      | `IDurationEtaTracker`      |
| Snapshot | `IEtaProgressSnapshot`     | `IStagedEtaProgressSnapshot`     | `IEtaDurationSnapshot`     |

Plus `IEtaApi` (the `.eta` facade itself), `IEtaTrackBuilder` (what
`estimate()` returns, before you pick a branch), `IEtaStage`,
`EtaRateAlgorithm`, `EtaStatus`, the `EtaScheduler` class backing the facade,
and `WithEtaApi` for naming a Time-Provider with this addon composed in:

```ts
import type { IEtaProgressSnapshot, WithEtaApi } from "@time-provider/addon-eta";

function report(snapshot: IEtaProgressSnapshot) {
  /* ... */
}
function track(tp: ITimeProvider<Date> & WithEtaApi) {
  /* ... */
}
```
