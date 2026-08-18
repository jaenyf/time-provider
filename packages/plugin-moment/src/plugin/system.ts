import {
  BaseSystemRuntime,
  BaseUtcOnlySystemPlugin,
  toInstant,
  type EpochMilliseconds,
  type TimezoneDefinition,
} from "@time-provider/core";
import { RuntimeHelper } from "./runtime-helper.ts";
import moment from "moment";

class SystemRuntime extends BaseSystemRuntime<moment.Moment> {
  constructor(localTimezone: TimezoneDefinition) {
    super(localTimezone, RuntimeHelper);
  }
  localNow(): moment.Moment {
    return RuntimeHelper.convertToLocalDate(this.localTimezone, this.utcNow());
  }
  utcNow(): moment.Moment {
    return moment.utc();
  }
  timestampNow(): EpochMilliseconds {
    return toInstant({ milliseconds: moment().valueOf() });
  }
}

export class SystemPlugin extends BaseUtcOnlySystemPlugin<moment.Moment> {
  protected readonly SystemRuntimeCtor = SystemRuntime;
}
