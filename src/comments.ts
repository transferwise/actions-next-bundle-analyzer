import { context } from '@actions/github';

import { PageBundleSizes, getBundleComparisonInfo } from './bundle-size';
import { formatTextFragments } from './text-format';
import type { Octokit } from './types';

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
  appName,
  referenceSha,
  referenceBundleSizes,
  actualBundleSizes,
}: {
  octokit: Octokit;
  issueNumber: number;
  appName: string;
  referenceSha: string;
  referenceBundleSizes: PageBundleSizes;
  actualBundleSizes: PageBundleSizes;
}): Promise<void> {
  const title = `### Bundle sizes [${appName}]`;
  const { info, routesTable } = getBundleComparisonInfo({
    referenceSha,
    referenceBundleSizes,
    actualBundleSizes,
  });
  const body = formatTextFragments(title, info, routesTable);
  const existingComment = await findCommentByTextMatch({
    octokit,
    issueNumber,
    text: title,
  });

  if (existingComment) {
    console.log(`Updating comment ${existingComment.id}`);
    const response = await octokit.rest.issues.updateComment({
      ...context.repo,
      comment_id: existingComment.id,
      body,
    });
    console.log(`Done with status ${response.status}`);
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
