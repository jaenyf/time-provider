/** The script's `name:value` arguments, the last one winning for a repeated name. */
export const args: Record<string, string> = Object.fromEntries(
  process.argv.slice(2).map((arg) => arg.split(":")),
);
