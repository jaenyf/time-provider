import { createTimeProvider } from "../../../../core/dist/index.mjs";
import { plugin } from "../../../../plugin-moment-timezone/dist/index.mjs";

const timeProvider = createTimeProvider.for(plugin).create();

console.log(timeProvider.clock.utcNow());
