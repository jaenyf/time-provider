export class SystemHelper {
  static getRealHostTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}
