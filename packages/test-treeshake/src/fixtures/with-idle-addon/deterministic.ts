import { createTimeProvider } from "../../../../core/dist/deterministic.mjs";
import { plugin } from "../../../../plugin-native/dist/deterministic.mjs";
import { addon } from "../../../../addon-idle/dist/deterministic.mjs";

const manual = createTimeProvider.for(plugin).use(addon).asManual().create();

manual.scheduler.idle.request(() => console.log("idle"));
manual.scheduler.idle.drain();
