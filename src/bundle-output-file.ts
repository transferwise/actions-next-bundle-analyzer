import * as github from '@actions/github';

import type { Octokit } from './types';

export async function createBundleOutputFile(
  octokit: Octokit,
  body: string,
): Promise<void> {
  console.log('Updating OUTPUT.md file with latest bundle sizes');
  const response = await octokit.rest.repos.createOrUpdateFileContents({
    ...github.context.repo,
    path: "OUTPUT.md",
    content: body,
    message: "docs: updating OUTPUT.md with latest bundle sizes",
  });
  console.log(`Done with status ${response.status}`);
}
