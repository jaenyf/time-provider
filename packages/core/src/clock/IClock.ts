export interface IClock<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
}
