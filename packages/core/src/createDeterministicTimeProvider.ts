import type { IDeterministicTimeProviderCreator } from "./builder/ITimeProviderCreators.ts";
import { DeterministicTimeProviderCreator } from "./builder/DeterministicTimeProviderCreators.ts";

export const createDeterministicTimeProvider: IDeterministicTimeProviderCreator =
  new DeterministicTimeProviderCreator();
