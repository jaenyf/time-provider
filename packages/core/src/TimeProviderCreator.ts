import type { IPlugin } from "./IPlugin.ts";
import type { ITimeProvider } from "./ITimeProvider.ts";

export class TimeProviderCreator<TDate> {
  #plugin?: IPlugin<TDate>;
  #mode: "continuous" | "fixed" | "manual";
  #initialDateTime?: string | number | TDate;

  constructor() {
    this.#plugin = undefined;
    this.#mode = "continuous";
    this.#initialDateTime = undefined;
  }

  for(adapter: IPlugin<TDate>): TimeProviderCreator<TDate> {
    this.#plugin = adapter;
    return this;
  }

  as(mode: "continuous" | "fixed" | "manual"): TimeProviderCreator<TDate> {
    this.#mode = mode;
    return this;
  }

  withInitialTime(initialDateTime?: string | number | TDate): TimeProviderCreator<TDate> {
    this.#initialDateTime = initialDateTime;
    return this;
  }

  create(): ITimeProvider<TDate> {
    if (undefined === this.#plugin) {
      throw new Error("Method 'for' has not been called with the plugin that should be used !");
    }
    switch (this.#mode) {
      case "continuous":
        if (undefined !== this.#initialDateTime) {
          throw new Error("An initial time can not be set when using 'continuous' mode");
        }
        return this.#plugin.createTimeAdapter();
      case "fixed":
        if (undefined === this.#initialDateTime) {
          throw new Error("An initial time have to be set when using 'fixed' mode");
        }
        return this.#plugin.createFixedAdapter(this.#initialDateTime);
      case "manual":
        if (undefined === this.#initialDateTime) {
          throw new Error("An initial time have to be set when using 'manual' mode");
        }
        return this.#plugin.createManualAdapter(this.#initialDateTime);
      default:
        throw new Error(`Unhandled plugin mode '${this.#mode as string}'`);
    }
  }
}
