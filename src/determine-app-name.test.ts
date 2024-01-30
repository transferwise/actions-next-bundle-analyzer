import { expect, test, describe, vi } from 'vitest';
import { determineAppName } from './determine-app-name';

vi.mock('@actions/github', () => ({
  context: {
    repo: {
      repo: 'abc',
    },
  },
}));

describe('determine-app-name', () => {
  test('no trailing slash', () => {
    expect(determineAppName('./foo/bar')).toBe('bar');
  });
  test('trailing slash', () => {
    expect(determineAppName('./foo/bar/')).toBe('bar');
  });
  test('no input', () => {
    expect(determineAppName()).toBe('abc');
  });
});
