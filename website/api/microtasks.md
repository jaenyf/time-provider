# IMicrotasks

```ts
interface IMicrotasks {
  /** Queues a callback to run at the next microtask checkpoint. */
  queue(callback: () => void): void;
}

/** The `IMicrotasks` of a fixed/manual/sequential Time-Provider - see `timeProvider.scheduler.microtasks`. */
interface IDeterministicMicrotasks extends IMicrotasks {
  /** Runs every callback queued through `queue`, in order, until the queue is empty. */
  drain(): void;
}
```

`timeProvider.scheduler.microtasks.queue` is the host's own `queueMicrotask` on a
system runtime, and the runtime's own queue on a fixed/manual/sequential
one, drained around due callbacks and scheduling calls.
`timeProvider.scheduler.microtasks.drain` (only on `IDeterministicMicrotasks`, i.e.
for a fixed, manual, or sequential Time-Provider) runs that checkpoint on
demand. See [Microtasks](/guide/microtasks) for the full breakdown,
including firing order and what disposal does to a still-queued microtask.

```ts
timeProvider.scheduler.microtasks.queue(() => log.push("m1"));
```
