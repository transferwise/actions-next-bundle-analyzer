import { context } from '@actions/github';

import { formatTextFragments } from './text-format';
import type { Octokit } from './types';
import { ActionInputs } from './input-helper';

const FALLBACK_COMPARISON_TEXT = 'No significant changes found';

async function findCommentByTextMatch({
  octokit,
  issueNumber,
  text,
}: {
  octokit: Octokit;
  issueNumber: number;
  text: string;
}) {
  const { data: comments } = await octokit.rest.issues.listComments({
    ...context.repo,
    issue_number: issueNumber,
  });
  return comments.find((comment) => comment.body?.includes(text));
}

export async function createOrReplaceComment({
  octokit,
  issueNumber,
  title,
  shaInfo,
  routesTable,
  dynamicTable,
  strategy,
}: {
  octokit: Octokit;
  issueNumber: number;
  title: string;
  shaInfo: string;
  routesTable: string | null;
  dynamicTable: string | null;
  strategy: ActionInputs['commentStrategy'];
}): Promise<void> {
  const existingComment = await findCommentByTextMatch({
    octokit,
    issueNumber,
    text: title,
  });

  const body = formatTextFragments(
    title,
    shaInfo,
    routesTable,
    dynamicTable,
    !routesTable?.trim() && !dynamicTable?.trim() ? FALLBACK_COMPARISON_TEXT : null,
  );

  if (existingComment) {
    console.log(`Updating comment ${existingComment.id}`);
    const response = await octokit.rest.issues.updateComment({
      ...context.repo,
      comment_id: existingComment.id,
      body,
    });
    console.log(`Done with status ${response.status}`);
  } else if (
    !existingComment &&
    !routesTable &&
    !dynamicTable &&
    strategy === 'skip-insignificant'
  ) {
    console.log(`Skipping comment [${title}]: no significant changes`);
  } else {
    console.log(`Creating comment on PR ${issueNumber}`);
    const response = await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: issueNumber,
      body,
    });
    console.log(`Done with status ${response.status}`);
  }
}
