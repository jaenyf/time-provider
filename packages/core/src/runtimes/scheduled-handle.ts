import { type IRuntime, type IScheduledHandle, type ScheduledHandleKind } from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

/** {@link IScheduledHandle} wrapping a system timer handle. */
export class ScheduledHandle<TDate, TNativeHandle> implements IScheduledHandle {
  #kind: ScheduledHandleKind;
  #owner: IRuntime<TDate>;
  #nativeHandle: TNativeHandle | undefined;
  #disposed: boolean;
  #abortController?: AbortController;
  constructor(kind: ScheduledHandleKind, owner: IRuntime<TDate>, nativeHandle: TNativeHandle) {
    this.#kind = kind;
    this.#owner = owner;
    this.#nativeHandle = nativeHandle;
    this.#disposed = false;
    this.#abortController = undefined;
  }

  get kind(): ScheduledHandleKind {
    return this.#kind;
  }

  get nativeHandle(): TNativeHandle | undefined {
    return this.#nativeHandle;
  }

  setNativeHandle(handle: TNativeHandle): void {
    this.#nativeHandle = handle;
  }

  get owner(): IRuntime<TDate> {
    return this.#owner;
  }

  get isDisposed(): boolean {
    return this.#disposed;
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    if (this.#abortController !== undefined) {
      this.#abortController.abort("Timer handle is being disposed");
    }
    this.#owner.clearTimer(this);
    this.#nativeHandle = undefined;
    this.#disposed = true;
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  get signal(): AbortSignal {
    if (this.#disposed === true) {
      return BaseRuntime.ABORTED_SIGNAL;
    }
    if (this.#abortController === undefined) {
      this.#abortController = new AbortController();
      this.#abortController.signal.addEventListener("abort", () => {
        this.dispose();
      });
    }
    return this.#abortController.signal;
  }
}
