import type { IPlugin } from "./IPlugin.ts";
import type { ITimeProvider } from "./ITimeProvider.ts";

export interface ICreateTimeProvider<TDate> {
  create(): ITimeProvider<TDate>;
}

export interface IFixedTimeProviderCreator<TDate> extends ICreateTimeProvider<TDate> {
  /**
   * Store the fixed time of the fixed time provider
   */
  withFixedTime(initialDateTime: string | number | TDate): ICreateTimeProvider<TDate>;
}

export interface IManualTimeProviderCreator<TDate> extends ICreateTimeProvider<TDate> {
  /**
   * Store the initial time of the manual time provider
   */
  withInitialTime(initialDateTime: string | number | TDate): ICreateTimeProvider<TDate>;
}

export interface ISequentialTimeProviderCreator<TDate> extends ICreateTimeProvider<TDate> {
  /**
   * Store a new sequential time to be provided when getting time
   */
  withSequentialTime(
    sequentialDateTime: string | number | TDate,
  ): ISequentialTimeProviderCreator<TDate>;
}

export interface IPluggedTimeProviderCreator<TDate> {
  /**
   * Create a Time-Provider for the system time.
   */
  create(): ITimeProvider<TDate>;
  /**
   * Start the setup of a manual Time-Provider.
   */
  asManual(): IManualTimeProviderCreator<TDate>;
  /**
   * Start the setup of a fixed Time-Provider.
   */
  asFixed(): IFixedTimeProviderCreator<TDate>;
  /**
   * Start the setup of a sequential Time-Provider.
   */
  asSequential(): ISequentialTimeProviderCreator<TDate>;
}

export interface ITimeProviderCreator<TDate> {
  /**
   * Setup a Time-Provider for a given plugin (adapter)
   * @param adapter The instance of the plugin (adapter) to use.
   */
  for(adapter: IPlugin<TDate>): IPluggedTimeProviderCreator<TDate>;
}
