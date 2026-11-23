/** Formats an estimated remaining duration as "~3 min left", or "~40 s left" under a minute. */
export function timeLeft(milliseconds: number): string {
  return milliseconds < 60_000
    ? `~${Math.ceil(milliseconds / 1000)} s left`
    : `~${Math.round(milliseconds / 60_000)} min left`;
}
