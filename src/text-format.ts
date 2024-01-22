function createHtmlComment(content: string) {
  return `<!-- ${content} -->`;
}

function getAppNameDelimiter(appName: string) {
  return {
    start: createHtmlComment(`${appName} start`),
    end: createHtmlComment(`${appName} end`),
  } as const;
}

export function formatTextFragments(...text: string[]) {
  return text
    .map((fragment) => fragment.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function swapContentPartiallyByDelimiter({
  existingContent,
  newPartialContent,
  delimiterIdentifier,
}: {
  existingContent: string;
  newPartialContent: string;
  delimiterIdentifier: string;
}) {
  const delimiter = getAppNameDelimiter(delimiterIdentifier);
  const startIndex = existingContent.indexOf(delimiter.start);
  const endIndex = existingContent.indexOf(delimiter.end, startIndex);
  if (startIndex === -1 || endIndex === -1) {
    return formatTextFragments(existingContent, delimiter.start, newPartialContent, delimiter.end);
  }
  const existingBodyStart = existingContent.substring(0, startIndex);
  const existingBodyEnd = existingContent.substring(endIndex + delimiter.end.length);

  return formatTextFragments(
    existingBodyStart,
    delimiter.start,
    newPartialContent,
    delimiter.end,
    existingBodyEnd,
  );
}

export function createContentByDelimiter({
  title,
  content,
  delimiterIdentifier,
}: {
  title: string;
  content: string;
  delimiterIdentifier: string;
}) {
  const appNameDelimiter = getAppNameDelimiter(delimiterIdentifier);
  return formatTextFragments(title, appNameDelimiter.start, content, appNameDelimiter.end);
}
