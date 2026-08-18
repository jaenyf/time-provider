import { type IRuntime, type ITimerHandle, type TimerKind } from "../types/types.ts";

export class TimerHandle<TDate, TNativeHandle> implements ITimerHandle {
  #kind: TimerKind;
  #owner: IRuntime<TDate>;
  #nativeHandle: TNativeHandle | undefined;
  #disposed: boolean;
  constructor(kind: TimerKind, owner: IRuntime<TDate>, nativeHandle: TNativeHandle) {
    this.#kind = kind;
    this.#owner = owner;
    this.#nativeHandle = nativeHandle;
    this.#disposed = false;
  }

  get isDisposed(): boolean {
    return this.#disposed;
  }

  get kind(): TimerKind {
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

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#owner.clearTimer(this);
    this.#nativeHandle = undefined;
    this.#disposed = true;
  }
}
