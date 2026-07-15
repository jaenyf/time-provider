import type { IParser } from "./IParser.ts";

export interface IParserOnlyProvider<TDate> {
  /**
   * Get the current configured parser
   */
  get parser(): IParser<TDate>;
}
