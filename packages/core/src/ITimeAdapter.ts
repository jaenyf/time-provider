import type { ITimeProvider } from "./ITimeProvider.ts";

export interface ITimeAdapter<TDate> extends ITimeProvider<TDate> {}
