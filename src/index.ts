import * as core from '@actions/core';
import * as github from '@actions/github';
import { getStaticBundleSizes, getMarkdownTable } from './bundle-size';

import { createOrReplaceComment } from './comments';
import { createOrReplaceIssue } from './issue';
import { downloadArtifactAsJson } from './download-artifacts';
import { uploadJsonAsArtifact } from './upload-artifacts';

const ARTIFACT_NAME = 'next-bundle-analyzer';
const FILE_NAME = 'bundle-sizes.json';

async function run() {
  try {
    const workflowId = core.getInput('workflow-id', { required: true });
    const workingDir = core.getInput('working-directory') || '';

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN || '');

    const {
      data: { default_branch },
    } = await octokit.rest.repos.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
    });

    const issueNumber = github.context.payload.pull_request?.number;

    console.log(`> Downloading bundle sizes from ${default_branch}`);
    const masterBundleSizes = (await downloadArtifactAsJson(
      octokit,
      default_branch,
      workflowId,
      ARTIFACT_NAME,
      FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(masterBundleSizes);

    console.log('> Calculating local bundle sizes');
    const bundleSizes = getStaticBundleSizes(workingDir);
    console.log(bundleSizes);

    console.log('> Uploading local bundle sizes');
    await uploadJsonAsArtifact(ARTIFACT_NAME, FILE_NAME, bundleSizes);

    if (issueNumber) {
      console.log('> Commenting on PR');
      const prefix = '### Bundle Sizes';
      const info = `Compared against ${masterBundleSizes.sha}`;

      const routesTable = getMarkdownTable(masterBundleSizes.data, bundleSizes, 'Route');
      const body = `${prefix}\n\n` + `${info}\n\n` + `${routesTable}\n\n`;
      createOrReplaceComment(octokit, issueNumber, prefix, body);
    } else if (github.context.ref === `refs/heads/${default_branch}`) {
      console.log('> Creating/updating bundle size issue');

      const routesTableNoDiff = getMarkdownTable([], bundleSizes, 'Route');
      const bodyNoDiff = `${routesTableNoDiff}\n\n`;
      createOrReplaceIssue(octokit, bodyNoDiff);
    }
  } catch (e) {
    console.log(e);
    core.setFailed((e as { message?: any })?.message);
  }
}

run();
