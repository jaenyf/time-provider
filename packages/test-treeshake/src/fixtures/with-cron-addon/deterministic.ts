import { createTimeProvider } from "../../../../core/dist/deterministic.mjs";
import { plugin } from "../../../../plugin-native/dist/deterministic.mjs";
import { addon } from "../../../../addon-cron/dist/deterministic.mjs";

const manual = createTimeProvider.for(plugin).use(addon).asManual().create();

manual.cron.schedule("0 9 * * MON-FRI", () => console.log("tick"));
manual.clock.advance({ days: 1 });
