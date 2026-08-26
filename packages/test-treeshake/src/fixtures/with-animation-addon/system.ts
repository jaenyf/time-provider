import { createTimeProvider } from "../../../../core/dist/index.mjs";
import { plugin } from "../../../../plugin-native/dist/index.mjs";
import { addon } from "../../../../addon-animation-frame/dist/index.mjs";

const timeProvider = createTimeProvider.for(plugin).use(addon).create();

timeProvider.animation.scheduleFrame(() => console.log("frame")).dispose();
