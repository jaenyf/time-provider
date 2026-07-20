import type { ILocalOnlyParser } from "./ILocalOnlyParser.ts";
import type { IUtcOnlyParser } from "./IUtcOnlyParser.ts";

export interface IParser<TDate> extends IUtcOnlyParser<TDate>, ILocalOnlyParser<TDate> {}
