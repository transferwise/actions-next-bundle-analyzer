import { context } from '@actions/github';

export function determineAppName(workingDirectory?: string) {
  return (
    workingDirectory
      ?.split('/')
      .reverse()
      .find((part) => part) ?? context.repo.repo
  );
}
