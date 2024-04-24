export function formatTextFragments(...text: Array<string | null>) {
  return text
    .map((fragment) => fragment?.trim())
    .filter(Boolean)
    .join('\n\n');
}
