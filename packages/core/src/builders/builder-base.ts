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
   * Every addon's cloned instance necessarily has these two members (see `ISystemAddon`/
   * `IDeterministicAddon`), excluded from collision-checking.
   */
  private static readonly REQUIRED_ADDON_MEMBERS = new Set(["applyToRuntime", "clone"]);

  /**
   * Guards `use()` implementations against an addon's cloned instance defining an extra,
   * builder-chain-extending property that would silently shadow an existing builder method.
   * @throws if `addonInstance` has an own enumerable, non-required property name already present
   * on `target`.
   */
  protected static assertNoAddonCollision(target: object, addonInstance: object): void {
    for (const key of Object.keys(addonInstance)) {
      if (BaseRuntimeBuilder.REQUIRED_ADDON_MEMBERS.has(key)) continue;
      if (key in target) {
        throw new Error(
          `Addon defines a property named '${key}' that collides with an existing builder property of the same name`,
        );
      }
    }
  }

  /**
   * Splices `addonInstance`'s own properties onto `target` (a builder), for an addon that also
   * extends the builder chain itself with extra chainable methods - excluding the required
   * `applyToRuntime`/`clone` members every addon has, which stay on the stored instance only. Call
   * {@link assertNoAddonCollision} first.
   */
  protected static spliceAddonExtras(target: object, addonInstance: object): void {
    for (const key of Object.keys(addonInstance)) {
      if (BaseRuntimeBuilder.REQUIRED_ADDON_MEMBERS.has(key)) continue;
      (target as Record<string, unknown>)[key] = (addonInstance as Record<string, unknown>)[key];
    }
  }
}
