import { expect, test, describe } from 'vitest';
import { createContentByDelimiter, swapContentPartiallyByDelimiter } from './text-format';

describe('swapContentPartiallyByDelimiter', () => {
  const original = `
## Bundle Sizes

<!-- cards-page start -->

alpha

<!-- cards-page end -->

<!-- account-page-frontend start -->

beta

<!-- account-page-frontend end -->
`.trim();

  test('in place swap', () => {
    const swapped = swapContentPartiallyByDelimiter({
      existingContent: original,
      newPartialContent: 'delta',
      delimiterIdentifier: 'account-page-frontend',
    });
    expect(swapped).toBe(
      `
## Bundle Sizes

<!-- cards-page start -->

alpha

<!-- cards-page end -->

<!-- account-page-frontend start -->

delta

<!-- account-page-frontend end -->
`.trim(),
    );
  });

  test('new addition in swap', () => {
    const swapped = swapContentPartiallyByDelimiter({
      existingContent: original,
      newPartialContent: 'gamma',
      delimiterIdentifier: 'stories-page',
    });
    expect(swapped).toBe(
      `
## Bundle Sizes

<!-- cards-page start -->

alpha

<!-- cards-page end -->

<!-- account-page-frontend start -->

beta

<!-- account-page-frontend end -->

<!-- stories-page start -->

gamma

<!-- stories-page end -->
`.trim(),
    );
  });
});

describe('createContentByDelimiter', () => {
  test('add content', () => {
    const swapped = createContentByDelimiter({
      title: '## Bundle Sizes',
      content: 'alpha',
      delimiterIdentifier: 'cards-page',
    });
    expect(swapped).toBe(
      `
## Bundle Sizes

<!-- cards-page start -->

alpha

<!-- cards-page end -->
`.trim(),
    );
  });
});
