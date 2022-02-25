import * as github from '@actions/github';

import type { Octokit } from './types';

export async function createCurrentBundleSizeIssue(
  octokit: Octokit,
  issueNumber: number,
  body: string,
): Promise<void> {
  console.log(`Updating issue ${issueNumber} with latest bundle sizes`);
  const response = await octokit.rest.issues.update({
    ...github.context.repo,
    body,
    issue_number: issueNumber
  });
  console.log(`Done with status ${response.status}`);
}
