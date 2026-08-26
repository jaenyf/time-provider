import { CompatRuntime } from "./compat-runtime.ts";

export const addon = function <TDate>() {
  return new CompatRuntime<TDate>();
};
