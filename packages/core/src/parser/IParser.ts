export interface IParser<TDate> {
  parse(input: string | number | TDate): TDate;
}
