import { createTimeProvider } from "../../../../core/dist/deterministic.mjs";
import { plugin } from "../../../../plugin-native/dist/deterministic.mjs";
import { addon } from "../../../../addon-animation-frame/dist/deterministic.mjs";

const manual = createTimeProvider.for(plugin).use(addon).asManual().create();

{
  using handle = manual.animation.scheduleFrame(() => console.log("frame"));
  manual.clock.advance({ milliseconds: 20 });
  handle.dispose();
}
