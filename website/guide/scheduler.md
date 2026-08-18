# Deterministic Timers

`ITimers` exposes the `once`/`every`/`wait`/`recurring` shape, but when each callback runs depends entirely on the
clock strategy backing it:

- **System** — callbacks run asynchronously, via real native timers, exactly
  like calling `setTimeout`/`setInterval` directly.
- **Manual** or **sequential** — callbacks run **synchronously, in-line**,
  as soon as they become due: either as a direct side effect of
  `setTimeout`/`setInterval` itself (a delay of `0` or negative is already
  due when scheduled), or of any call that moves the clock forward
  (`advance()`, `clock.localNow()`, `clock.utcNow()`). There is no event
  loop tick involved — a due callback has already run by the time the
  triggering call returns.
- **Fixed** — time never advances, so a scheduled callback is never due; it
  never runs, regardless of the delay it was registered with.

This is what makes manual/sequential tests deterministic without `await`,
`vi.runAllTimers()`, or a fake-timer install/restore step — but it does mean
call ordering can differ subtly from a real async run, since a callback can
now execute in the middle of the call that triggered it.

`recurring` (see [ITimers](/api/timers)) shares a heap with
`once`/`every`, so it fires in the same true chronological order
as the other two. A due `recurring` entry is pulled out of the heap
before its run happens, and only reinserted afterward if the run's return
value is actually rearming it. That's what keeps it safe for the run to
itself schedule new work (on a manual/sequential clock, that reentrantly
drains the same heap) without the entry being visible to that nested drain
while its own fate is still being decided.

## Implementation notes

Internally, `once`/`every` insert into a binary heap ordered by
due time, then check only the heap's root for firing immediately — not the
whole pending set, since nothing already pending can have newly become due
from an insert alone. Advancing time drains the heap from the root for as
long as entries are due, since any number of them may have become due at
once; timeouts and intervals share one heap, so a mixed batch fires in true
chronological order rather than draining every due timeout before any due
interval is considered. A repeating interval whose delay is smaller than the
elapsed advance re-fires as many times as would fit, matching how a real
interval behaves when the event loop was blocked past a firing.

Try registering timers and advancing a manual clock in the
[Playground](/playground) to see the firing order for yourself.
