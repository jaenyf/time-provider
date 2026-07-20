export interface IParserProvider<TParser> {
  /**
   * Get the current configured parser
   */
  get parser(): TParser;
}
