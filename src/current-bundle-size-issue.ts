import * as github from '@actions/github';

import type { Octokit } from './types';

const ISSUE_TITLE = 'Current Bundle Sizes';

export async function createCurrentBundleSizeIssue(
  octokit: Octokit,
  body: string,
): Promise<void> {
  console.log(`Creating or updating issue ${ISSUE_TITLE} to show latest bundle sizes`);

  const { data: issues } = await octokit.rest.issues.listForRepo(github.context.repo);

  const existing = issues.find(issue => issue.title === ISSUE_TITLE);

  if (existing) {
    const issue_number = existing.number;
    console.log(`Updating issue ${issue_number} with latest bundle sizes`);

    const response = await octokit.rest.issues.update({
      ...github.context.repo,
      body,
      issue_number
    });

    console.log(`Issue updated with status ${response.status}`);
  } else {
    console.log(`Creating issue ${ISSUE_TITLE} to show latest bundle sizes`);

    const response = await octokit.rest.issues.create({
      ...github.context.repo,
      body,
      title: ISSUE_TITLE
    });

    console.log(`Issue created with status ${response.status}`);
  }
}