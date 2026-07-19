/**
 * `realNow` is intended to ensure a real time instant measurement,
 * even if a benchmarked library might have globally patched te `performance` api.
 * Because bencmark from vitest relies on `performance` api,
 * this is required to ensure measurements stay accurate even if a library under test replaces `performance.now`
 */
export const realNow: () => number = performance.now.bind(performance);
