import * as github from '@actions/github';

import type { Octokit } from './types';
import { createContentByDelimiter, swapContentPartiallyByDelimiter } from './text-format';

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

export async function createOrUpdateCommentPartially({
  octokit,
  issueNumber,
  appName,
  title,
  body,
}: {
  octokit: Octokit;
  issueNumber: number;
  appName: string;
  title: string;
  body: string;
}): Promise<void> {
  const comments = await octokit.rest.issues.listComments({
    ...github.context.repo,
    issue_number: issueNumber,
  });

  const existingComment = comments.data.find((comment) => comment.body?.includes(title));

  if (existingComment) {
    const commentBody = existingComment.body!;
    const newBody = swapContentPartiallyByDelimiter({
      existingContent: commentBody,
      newPartialContent: body,
      delimiterIdentifier: appName,
    });

    console.log(`Updating comment ${existingComment.id}`);
    const response = await octokit.rest.issues.updateComment({
      ...github.context.repo,
      comment_id: existingComment.id,
      body: newBody,
    });
    console.log(`Done with status ${response.status}`);
  } else {
    const newBody = createContentByDelimiter({
      title,
      content: body,
      delimiterIdentifier: appName,
    });
    console.log(`Creating comment on PR ${issueNumber}`);
    const response = await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: issueNumber,
      body: newBody,
    });
    console.log(`Done with status ${response.status}`);
  }
}
