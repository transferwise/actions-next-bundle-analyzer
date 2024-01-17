import * as github from '@actions/github';

import type { Octokit } from './types';

function createHtmlComment(content: string) {
  return `<!-- ${content} -->`;
}

function getAppNameDelimiter(appName: string) {
  return {
    start: createHtmlComment(`${appName} start`),
    end: createHtmlComment(`${appName} end`),
  } as const;
}

export function formatTextFragments(...text: string[]) {
  return text.join('\n\n');
}

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

function swapContentPartiallyByDelimiter({
  existingContent,
  newPartialContent,
  delimiterIdentifier,
}: {
  existingContent: string;
  newPartialContent: string;
  delimiterIdentifier: string;
}) {
  const delimiter = getAppNameDelimiter(delimiterIdentifier);
  const startIndex = existingContent.indexOf(delimiter.start);
  const endIndex = existingContent.indexOf(delimiter.end, startIndex);
  if (startIndex === -1 || endIndex === -1) {
    return formatTextFragments(existingContent, delimiter.start, newPartialContent, delimiter.end);
  }
  const existingBodyStart = existingContent.substring(0, startIndex);
  const existingBodyEnd = existingContent.substring(endIndex + delimiter.end.length);

  return formatTextFragments(
    existingBodyStart,
    delimiter.start,
    newPartialContent,
    delimiter.end,
    existingBodyEnd,
  );
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
    const appNameDelimiter = getAppNameDelimiter(appName);
    const newBody = formatTextFragments(title, appNameDelimiter.start, body, appNameDelimiter.end);
    console.log(`Creating comment on PR ${issueNumber}`);
    const response = await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: issueNumber,
      body: newBody,
    });
    console.log(`Done with status ${response.status}`);
  }
}
