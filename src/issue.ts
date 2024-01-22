import { context } from '@actions/github';

import type { Octokit } from './types';
import { createContentByDelimiter, swapContentPartiallyByDelimiter } from './text-format';

const ISSUE_TITLE = 'Current Bundle Sizes';

export async function createOrUpdateIssuePartially({
  octokit,
  appName,
  body,
}: {
  octokit: Octokit;
  appName: string;
  body: string;
}): Promise<void> {
  const { data: issues } = await octokit.rest.issues.listForRepo(context.repo);

  const existingIssue = issues.find((issue) => issue.title === ISSUE_TITLE);

  if (existingIssue && existingIssue.body) {
    const newBody = swapContentPartiallyByDelimiter({
      existingContent: existingIssue.body,
      newPartialContent: body,
      delimiterIdentifier: appName,
    });
    console.log(`Updating issue ${existingIssue.number} with latest bundle sizes`);

    const response = await octokit.rest.issues.update({
      ...context.repo,
      body: newBody,
      issue_number: existingIssue.number,
    });

    console.log(`Issue update response status ${response.status}`);
  } else {
    const newBody = createContentByDelimiter({
      title: '',
      content: body,
      delimiterIdentifier: appName,
    });
    console.log(`Creating issue ${ISSUE_TITLE} to show latest bundle sizes`);
    const response = await octokit.rest.issues.create({
      ...context.repo,
      body: newBody,
      title: ISSUE_TITLE,
    });

    console.log(`Issue creation response status ${response.status}`);
  }
}
