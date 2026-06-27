export interface Provider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  parse(input: string | number | TDate): TDate;
}
