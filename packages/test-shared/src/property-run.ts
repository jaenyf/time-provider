import fc from "fast-check";

const PROPERTY_RUN = { seed: 20260928, numRuns: 100 };

/**
 * Checks a synchronous property with the shared seed and run count.
 * @param property The property to check.
 * @throws If the property fails, reporting the shrunk counterexample and its replay path.
 */
export function assertProperty<Ts extends [unknown, ...unknown[]]>(
  property: fc.IPropertyWithHooks<Ts>,
): void {
  // oxlint-disable-next-line typescript/no-floating-promises
  fc.assert(property, PROPERTY_RUN);
}
