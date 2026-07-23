import { createTimeProvider } from "../../../core/dist/deterministic.mjs";
import { plugin } from "../../../plugin-native/dist/deterministic.mjs";

const timeProvider = createTimeProvider.for(plugin).asManual().create();

console.log(timeProvider.clock.utcNow());
timeProvider.clock.advance({ seconds: 1 });
