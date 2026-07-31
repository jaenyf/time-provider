/**
 * Ensure the e2e tests have the required polyfills to run
 */

//@ts-ignore 'any' type
if ((typeof globalThis.requestAnimationFrame as unknown) !== "function") {
  //@ts-ignore 'any' type
  globalThis.requestAnimationFrame = function (_callback: () => void) {};
}
//@ts-ignore 'any' type
if ((typeof globalThis.cancelAnimationFrame as unknown) !== "function") {
  //@ts-ignore 'any' type
  globalThis.cancelAnimationFrame = function (_id: unknown) {};
}
