import type { TimezoneDefinition } from "../types/types.ts";
import { SystemHelper } from "../runtimes/runtime-base.ts";

/**
 * Shared timezone-composition base for both the system and the deterministic plugged creators.
 */
export abstract class BaseTimeProviderCreator<TPlugin> {
  #plugin: TPlugin;
  #localTimezone: TimezoneDefinition;
  #shouldUseHostLocalTimezone: boolean;

  static defaultTimezone: TimezoneDefinition = "Etc/UTC";

  constructor(plugin: TPlugin, localTimezone: TimezoneDefinition) {
    this.#plugin = plugin;
    this.#localTimezone = localTimezone;
    this.#shouldUseHostLocalTimezone = false;
  }

  protected get plugin(): TPlugin {
    return this.#plugin;
  }

  protected get localTimezone() {
    return this.#shouldUseHostLocalTimezone
      ? SystemHelper.getRealHostTimezone()
      : this.#localTimezone;
  }

  protected set localTimezone(value: TimezoneDefinition) {
    this.#localTimezone = value;
  }

  withTimezone(timezone: TimezoneDefinition): this {
    this.localTimezone = timezone;
    this.#shouldUseHostLocalTimezone = false;
    return this;
  }

  withDefaultTimezone(): this {
    this.localTimezone = BaseTimeProviderCreator.defaultTimezone;
    this.#shouldUseHostLocalTimezone = false;
    return this;
  }

  withHostTimezone(): this {
    this.#shouldUseHostLocalTimezone = true;
    return this;
  }
}
