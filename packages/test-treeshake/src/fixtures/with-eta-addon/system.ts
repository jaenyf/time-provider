import { createTimeProvider } from "../../../../core/dist/index.mjs";
import { plugin } from "../../../../plugin-native/dist/index.mjs";
import { addon } from "../../../../addon-eta/dist/index.mjs";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

console.log(timeProvider.eta.estimate());
