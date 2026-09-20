import { createTimeProvider } from "../../../../core/dist/deterministic.mjs";
import { plugin } from "../../../../plugin-native/dist/deterministic.mjs";
import { addon } from "../../../../addon-compat/dist/deterministic.mjs";

const manual = createTimeProvider.for(plugin).use(addon).asManual().create();

manual.compat.setTimeout(() => console.log("tick"), 10);
manual.clock.advance({ seconds: 1 });
