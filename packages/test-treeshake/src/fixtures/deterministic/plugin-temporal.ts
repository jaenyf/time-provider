import { createTimeProvider } from "../../../../core/dist/deterministic.mjs";
import { plugin } from "../../../../plugin-temporal/dist/deterministic.mjs";

const creator = createTimeProvider.for(plugin);

const fixed = creator.asFixed().create();
console.log(fixed.clock.utcNow());

const manual = creator.asManual().create();
console.log(manual.clock.utcNow());
manual.clock.advance({ seconds: 1 });

const sequential = creator.asSequential().create();
console.log(sequential.clock.utcNow());
