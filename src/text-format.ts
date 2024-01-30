export function formatTextFragments(...text: string[]) {
  return text
    .map((fragment) => fragment.trim())
    .filter(Boolean)
    .join('\n\n');
}
