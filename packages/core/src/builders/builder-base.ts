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
   * Every addon-builder necessarily has this member (see `IAddonBuilder`), excluded from
   * collision-checking.
   */
  private static readonly REQUIRED_ADDON_BUILDER_MEMBERS = new Set(["create"]);

  /**
   * Guards `use()` implementations against an addon-builder defining an extra,
   * builder-chain-extending property that would silently shadow an existing builder method.
   * @throws if `addonBuilder` has an own enumerable, non-required property name already present
   * on `target`.
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

  /**
   * Splices `addonBuilder`'s own properties onto `target` (a runtime-builder), for an
   * addon-builder that also extends the builder chain itself with extra chainable configuration
   * methods (e.g. the animation-frame addon-builder's `withHostFramesRate`) - excluding the
   * required `create` member every addon-builder has, which stays on the stored addon-builder
   * only. Call {@link assertNoAddonCollision} first.
   */
  protected static spliceAddonExtras(target: object, addonBuilder: object): void {
    for (const key of Object.keys(addonBuilder)) {
      if (BaseRuntimeBuilder.REQUIRED_ADDON_BUILDER_MEMBERS.has(key)) continue;
      (target as Record<string, unknown>)[key] = (addonBuilder as Record<string, unknown>)[key];
    }
  }
}
