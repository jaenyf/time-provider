import { AddonBase, AddonHelper, type IRuntime, type IScheduledHandle } from "@time-provider/core";
import type { IDeterministicAddon, ITaggedTimers } from "@time-provider/core/deterministic";
import type { IDeterministicIdleApi } from "./types.ts";

/**
 * Tags every entry this addon registers - one constant is enough since `.use()` only ever lets
 * one idle addon compose onto a given runtime (a second `.use(idleAddon)` call fails outright,
 * trying to redefine the same `idle` property).
 */
const IDLE_TAG = Symbol("idle");

/**
 * How far out a `request()`'s placeholder entry is registered - far enough that it never becomes
 * due on its own during a test's lifetime, so only `drain()` ever removes it.
 */
const FAR_FUTURE_DELAY = { days: 365 * 100 };

/**
 * Implements {@link IDeterministicIdleApi} via the runtime's own `taggedTimers` capability (see
 * `ITaggedTimers` in `@time-provider/core`): `request()` registers a real, far-future-due entry
 * in the shared due-heap under this addon's own tag, and `drain(maxCount?)` retrieves up to
 * `maxCount` of them directly - oldest first - through that tag's own index, without scanning any
 * other pending timer/interval/recurring entry sharing the heap.
 *
 * Every deterministic runtime kind (fixed/manual/sequential) shares the same `taggedTimers`
 * implementation and behaves identically here - unlike a design relying on the runtime's own
 * due-draining to fire a placeholder, which a fixed clock disables entirely (see
 * `BaseFixedRuntime.disableDueDraining` in core).
 */
export class DeterministicIdleScheduler<TDate>
  extends AddonBase<TDate>
  implements IDeterministicAddon<TDate>, IDeterministicIdleApi
{
  #isDisposed: boolean;

  constructor() {
    super();
    this.#isDisposed = false;
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

  applyToRuntimeImpl(runtime: IRuntime<TDate>): void {
    AddonHelper.extendRuntimeWithProperty(
      runtime,
      "idle",
      { request: this.request.bind(this), drain: this.drain.bind(this) },
      this,
    );
  }

  /**
   * `AddonBase.runtime` is typed `IRuntime<TDate>` - the shape shared with system runtimes -
   * since that's the only type `.use()` can infer an addon against. `taggedTimers` isn't part of
   * that public type (deliberately - it's plumbing for addons like this one, not something every
   * consumer of a deterministic runtime should see), but it's always present at runtime on the
   * deterministic runtime this addon is actually composed onto (via
   * `@time-provider/addon-idle/deterministic`), so this cast is safe in that - and only that -
   * context.
   */
  #taggedTimers(): ITaggedTimers {
    return (this.runtime as unknown as { taggedTimers: ITaggedTimers }).taggedTimers;
  }

  request(callback: () => void): IScheduledHandle {
    return this.#taggedTimers().register(IDLE_TAG, FAR_FUTURE_DELAY, callback);
  }

  drain(maxCount = Number.POSITIVE_INFINITY): number {
    const callbacks = this.#taggedTimers().take(IDLE_TAG, maxCount);
    for (const callback of callbacks) callback();
    return callbacks.length;
  }
}
