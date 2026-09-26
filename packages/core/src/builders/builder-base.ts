import type { TimezoneDefinition } from "../types/types.ts";
import { SystemHelper } from "../runtimes/runtime-base.ts";

/** Shared timezone builder base. */
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

  /** Required addon-builder members excluded from collision checks. */
  private static readonly REQUIRED_ADDON_BUILDER_MEMBERS = new Set(["create"]);

  /**
   * Checks for addon-builder property collisions.
   * @throws If `addonBuilder` defines a non-required own property already on `target`.
   */
  protected static assertNoAddonCollision(target: object, addonBuilder: object): void {
    for (const key of Object.keys(addonBuilder)) {
      if (BaseRuntimeBuilder.REQUIRED_ADDON_BUILDER_MEMBERS.has(key)) continue;
      if (key in target) {
        throw new Error(
          `Addon defines a property named '${key}' that collides with an existing builder property of the same name`,
        );
      }
    }
  }

  /** Copies addon-builder extras onto `target`. */
  protected static spliceAddonExtras(target: object, addonBuilder: object): void {
    for (const key of Object.keys(addonBuilder)) {
      if (BaseRuntimeBuilder.REQUIRED_ADDON_BUILDER_MEMBERS.has(key)) continue;
      (target as Record<string, unknown>)[key] = (addonBuilder as Record<string, unknown>)[key];
    }
  }
}
