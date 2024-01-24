import { context } from '@actions/github';

import { PageBundleSizes, getMarkdownTable } from './bundle-size';
import type { Octokit } from './types';

async function findIssueByTitleMatch({ octokit, title }: { octokit: Octokit; title: string }) {
  const { data: issues } = await octokit.rest.issues.listForRepo(context.repo);
  return issues.find((issue) => issue.title === title);
}

export async function createOrReplaceIssue({
  octokit,
  appName,
  actualBundleSizes,
}: {
  octokit: Octokit;
  appName: string;
  actualBundleSizes: PageBundleSizes;
}): Promise<void> {
  const title = `### Bundle sizes [${appName}]`;
  const routesTable = getMarkdownTable([], actualBundleSizes, 'Route');
  const existingIssue = await findIssueByTitleMatch({ octokit, title });

  if (existingIssue) {
    console.log(`Updating issue ${existingIssue.number} with latest bundle sizes`);
    const response = await octokit.rest.issues.update({
      ...context.repo,
      body: routesTable,
      issue_number: existingIssue.number,
    });
    console.log(`Issue update response status ${response.status}`);
  } else {
    console.log(`Creating issue "${title}" to show latest bundle sizes`);
    const response = await octokit.rest.issues.create({
      ...context.repo,
      body: routesTable,
      title,
    });
    console.log(`Issue creation response status ${response.status}`);
  }
}
