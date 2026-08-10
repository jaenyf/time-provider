/**
 * System addon fails fast at construction if requestIdleCallback/cancelIdleCallback aren't already available
 * Note: vitest test.isolate defaults to true and prevents this import from leaking to the other tests
 */

//@ts-ignore 'any' type
if ((typeof globalThis.requestIdleCallback as unknown) !== "function") {
  //@ts-ignore 'any' type
  globalThis.requestIdleCallback = function (_callback: () => void) {};
}
//@ts-ignore 'any' type
if ((typeof globalThis.cancelIdleCallback as unknown) !== "function") {
  //@ts-ignore 'any' type
  globalThis.cancelIdleCallback = function (_id: unknown) {};
}
