import type {
  ISystemPlugin,
  ITimeProvider,
  IUtcOnlySystemPlugin,
  TimezoneDefinition,
} from "../types/types.ts";
import type {
  ISystemPluggedTimeProviderCreator,
  ITimeProviderCreator,
  IUtcOnlySystemPluggedTimeProviderCreator,
} from "./builders.ts";
import { BaseTimeProviderCreator } from "./builder-base.ts";

type AnySystemPlugin<TDate> = ISystemPlugin<TDate> | IUtcOnlySystemPlugin<TDate>;

class SystemPluggedTimeProviderCreator<TDate>
  extends BaseTimeProviderCreator<AnySystemPlugin<TDate>>
  implements ISystemPluggedTimeProviderCreator<TDate>
{
  constructor(plugin: AnySystemPlugin<TDate>, localTimezone: TimezoneDefinition) {
    super(plugin, localTimezone);
  }

  create(): ITimeProvider<TDate> {
    return Object.freeze(
      this.plugin.supportsLocalTime
        ? this.plugin.createSystemRuntime(this.localTimezone)
        : (this.plugin.createSystemRuntime() as unknown as ITimeProvider<TDate>),
    );
  }
}

export class TimeProviderCreator implements ITimeProviderCreator {
  /*
    The underlying runtime objects always have the full capability regardless of which overload matched.
    Only the declared type at this boundary is restricted for IUtcOnlySystemPlugin adapters, so this widening is safe.
  */
  for<TDate>(adapter: IUtcOnlySystemPlugin<TDate>): IUtcOnlySystemPluggedTimeProviderCreator<TDate>;
  for<TDate>(adapter: ISystemPlugin<TDate>): ISystemPluggedTimeProviderCreator<TDate>;
  for<TDate>(
    adapter: AnySystemPlugin<TDate>,
  ): ISystemPluggedTimeProviderCreator<TDate> | IUtcOnlySystemPluggedTimeProviderCreator<TDate> {
    return new SystemPluggedTimeProviderCreator(adapter, "Etc/UTC");
  }
}

export const createTimeProvider: ITimeProviderCreator = new TimeProviderCreator();
