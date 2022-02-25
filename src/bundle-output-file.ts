import * as github from '@actions/github';
import { Base64 } from 'js-base64';

import type { Octokit } from './types';

export async function createBundleOutputFile(
  octokit: Octokit,
  issueNumber: number,
  body: string,
): Promise<void> {
  console.log('Updating OUTPUT.md file with latest bundle sizes');
  const content = Base64.encode(body);
  const response = await octokit.rest.repos.createOrUpdateFileContents({
    ...github.context.repo,
    path: "OUTPUT.md",
    content,
    message: "docs: updating OUTPUT.md with latest bundle sizes",
    issue_number: issueNumber
  });
  console.log(`Done with status ${response.status}`);
}
