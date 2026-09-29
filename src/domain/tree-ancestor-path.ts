export function getAncestorPath(key: string, parentByKey: Record<string, string | null>): string[] {
  const path: string[] = [];
  const seen = new Set<string>();
  let current = parentByKey[key];
  while (current && !seen.has(current) && Object.hasOwn(parentByKey, current)) {
    path.unshift(current);
    seen.add(current);
    current = parentByKey[current];
  }
  return path;
}
