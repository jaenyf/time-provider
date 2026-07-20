export interface IClockProvider<TClock> {
  /**
   * Get the current configured clock
   */
  get clock(): TClock;
}
