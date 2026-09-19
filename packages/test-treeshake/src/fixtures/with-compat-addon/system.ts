import { createTimeProvider } from "../../../../core/dist/index.mjs";
import { plugin } from "../../../../plugin-native/dist/index.mjs";
import { addon } from "../../../../addon-compat/dist/index.mjs";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

timeProvider.compat.timers.clearTimeout(timeProvider.compat.timers.setTimeout(() => {}, 10));
