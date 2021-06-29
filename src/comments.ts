import * as github from '@actions/github';

import type { Octokit } from './types';

export async function createOrReplaceComment(
  octokit: Octokit,
  issueNumber: number,
  searchString: string,
  body: string,
): Promise<void> {
  const comments = await octokit.rest.issues.listComments({
    ...github.context.repo,
    issue_number: issueNumber,
  });

  const existing = comments.data.find(
    (comment) => comment.body && comment.body.includes(searchString),
  );

  if (existing) {
    console.log(`Updating comment ${existing.id}`);
    const response = await octokit.rest.issues.updateComment({
      ...github.context.repo,
      comment_id: existing.id,
      body,
    });
    console.log(`Done with status ${response.status}`);
  } else {
    console.log(`Creating comment on PR ${issueNumber}`);
    const response = await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: issueNumber,
      body,
    });
    console.log(`Done with status ${response.status}`);
  }
}
