import { createTimeProvider } from "../../../../core/dist/index.mjs";
import { plugin } from "../../../../plugin-native/dist/index.mjs";
import { addon } from "../../../../addon-idle/dist/index.mjs";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

timeProvider.scheduler.idle.request(() => console.log("idle")).dispose();
