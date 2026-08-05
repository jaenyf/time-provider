import { createTimeProvider } from "../../../../core/dist/index.mjs";
import { plugin } from "../../../../plugin-native/dist/index.mjs";
import { addon } from "../../../../addon-cron/dist/index.mjs";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

timeProvider.cron.schedule("0 9 * * MON-FRI", () => console.log("tick"));
