import { createTimeProvider } from "../../../../core/dist/deterministic.mjs";
import { plugin } from "../../../../plugin-temporal/dist/deterministic.mjs";

const builder = createTimeProvider.for(plugin);

const fixed = builder.asFixed().create();
console.log(fixed.clock.utcNow());

const manual = builder.asManual().create();
console.log(manual.clock.utcNow());
manual.clock.advance({ seconds: 1 });

const sequential = builder.asSequential().create();
console.log(sequential.clock.utcNow());
