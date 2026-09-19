import { createTimeProvider } from "../../../../core/dist/deterministic.mjs";
import { plugin } from "../../../../plugin-native/dist/deterministic.mjs";
import { addon } from "../../../../addon-eta/dist/deterministic.mjs";

const manual = createTimeProvider.for(plugin).use(addon).asManual().create();

console.log(manual.eta.estimate());
