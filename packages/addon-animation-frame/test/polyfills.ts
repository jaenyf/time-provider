/**
 * System addon fails fast at construction if requestAnimationFrame/cancelAnimationFrame aren't already available
 * Note: vitest test.isolate defaults to true and prevents this import from leaking to the other tests
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
