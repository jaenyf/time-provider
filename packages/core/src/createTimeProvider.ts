import type { ITimeProviderCreator } from "./ITimeProviderCreators.ts";
import { TimeProviderCreator } from "./TimeProviderCreators.ts";

export const createTimeProvider: ITimeProviderCreator = new TimeProviderCreator();
