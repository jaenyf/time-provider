import { type IRuntime, type IScheduledHandle, type ScheduledHandleKind } from "../types/types.ts";
import { BaseRuntime } from "./runtime-base.ts";

export class ScheduledHandle<TDate, TNativeHandle> implements IScheduledHandle {
  #kind: ScheduledHandleKind;
  #owner: IRuntime<TDate>;
  #nativeHandle: TNativeHandle | undefined;
  #disposed: boolean;
  #abortControler?: AbortController;
  constructor(kind: ScheduledHandleKind, owner: IRuntime<TDate>, nativeHandle: TNativeHandle) {
    this.#kind = kind;
    this.#owner = owner;
    this.#nativeHandle = nativeHandle;
    this.#disposed = false;
    this.#abortControler = undefined;
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
    if (this.#abortControler !== undefined) {
      this.#abortControler.abort("Timer handle is being disposed");
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
    if (this.#abortControler === undefined) {
      this.#abortControler = new AbortController();
      this.#abortControler.signal.addEventListener("abort", () => {
        this.dispose();
      });
    }
    return this.#abortControler.signal;
  }
}
