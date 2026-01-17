export function prettyStringify(obj: unknown, spaces = 2): string {
  return JSON.stringify(obj, null, spaces);
}