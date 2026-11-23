import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

/** Prints how long the process ran when it exits, measured with Time-Provider's own timings. */
export function logDurationOnExit(script: string): void {
  const timeProvider = createTimeProvider.for(plugin).create();
  process.on("exit", () => {
    const seconds = Math.round(timeProvider.timings.measure(script).duration / 1000);
    const minutes = Math.floor(seconds / 60);
    console.log(`\n${script} took ${minutes > 0 ? `${minutes} min ` : ""}${seconds % 60} s`);
  });
}
