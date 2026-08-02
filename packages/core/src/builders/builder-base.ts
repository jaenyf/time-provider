import type { TimezoneDefinition } from "../types/types.ts";
import { SystemHelper } from "../runtimes/runtime-base.ts";

/**
 * Shared timezone-composition base for both the system and the deterministic plugged builders.
 */
export abstract class BaseRuntimeBuilder<TPlugin> {
  #plugin: TPlugin;
  #localTimezone: TimezoneDefinition;
  #shouldUseHostLocalTimezone: boolean;

  static defaultTimezone: TimezoneDefinition = "Etc/UTC";

  constructor(plugin: TPlugin, localTimezone: TimezoneDefinition) {
    if (!plugin) {
      throw new Error("The given plugin is not defined");
    }
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
    this.localTimezone = BaseRuntimeBuilder.defaultTimezone;
    this.#shouldUseHostLocalTimezone = false;
    return this;
  }

  withHostTimezone(): this {
    this.#shouldUseHostLocalTimezone = true;
    return this;
  }

  /**
   * Guards `use()` implementations against an addon's cloned instance defining a property that
   * would silently shadow an existing builder method (own, inherited, or added by a previously
   * used addon) when spliced onto the builder via `Object.assign`.
   * @throws if `addonInstance` has an own enumerable property name already present on `target`.
   */
  protected static assertNoAddonCollision(target: object, addonInstance: object): void {
    for (const key of Object.keys(addonInstance)) {
      if (key in target) {
        throw new Error(
          `Addon defines a property named '${key}' that collides with an existing builder property of the same name`,
        );
      }
    }
  }
}
