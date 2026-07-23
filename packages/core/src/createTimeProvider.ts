import type { ITimeProviderCreator } from "./builder/ITimeProviderCreators.ts";
import { TimeProviderCreator } from "./builder/SystemTimeProviderCreators.ts";

export const createTimeProvider: ITimeProviderCreator = new TimeProviderCreator();
