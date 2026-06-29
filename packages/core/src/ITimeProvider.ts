export interface ITimeProvider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  parse(input: string | number | TDate): TDate;
}
