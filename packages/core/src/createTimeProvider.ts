import type { ITimeProviderCreator } from "./builder/ITimeProviderCreators.ts";
import { TimeProviderCreator } from "./builder/TimeProviderCreators.ts";

export const createTimeProvider: ITimeProviderCreator = new TimeProviderCreator();
