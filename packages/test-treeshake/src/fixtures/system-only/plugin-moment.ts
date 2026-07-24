import { createTimeProvider } from "../../../../core/dist/index.mjs";
import { plugin } from "../../../../plugin-moment/dist/index.mjs";

const timeProvider = createTimeProvider.for(plugin).create();

console.log(timeProvider.clock.utcNow());
