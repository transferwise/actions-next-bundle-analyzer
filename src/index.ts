import * as core from '@actions/core';
import * as github from '@actions/github';
import { getStaticBundleSizes, getDynamicBundleSizes, getMarkdownTable } from './bundle-size';

import { createOrReplaceComment } from './comments';
import { createOrReplaceIssue } from './issue';
import { downloadArtifactAsJson } from './download-artifacts';
import { uploadJsonAsArtifact } from './upload-artifacts';

const ARTIFACT_NAME = 'next-bundle-analyzer';
const FILE_NAME = 'bundle-sizes.json';
const DYNAMIC_FILE_NAME = 'dynamic-bundle-sizes.json';

async function run() {
  try {
    const workflowId = core.getInput('workflow-id', { required: true });
    const baseBranch = core.getInput('base-branch') || 'master';
    const workingDir = core.getInput('working-directory') || '';

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN || '');
    const issueNumber = github.context.payload.pull_request?.number;

    console.log(`> Downloading bundle sizes from ${baseBranch}`);
    const masterBundleSizes = (await downloadArtifactAsJson(
      octokit,
      baseBranch,
      workflowId,
      ARTIFACT_NAME,
      FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(masterBundleSizes);
    const masterDynamicBundleSizes = (await downloadArtifactAsJson(
      octokit,
      baseBranch,
      workflowId,
      ARTIFACT_NAME,
      DYNAMIC_FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(masterDynamicBundleSizes);

    console.log('> Calculating local bundle sizes');
    const bundleSizes = getStaticBundleSizes(workingDir);
    console.log(bundleSizes);
    const dynamicBundleSizes = getDynamicBundleSizes(workingDir);
    console.log(dynamicBundleSizes);

    console.log('> Uploading local bundle sizes');
    await uploadJsonAsArtifact(ARTIFACT_NAME, FILE_NAME, bundleSizes);
    await uploadJsonAsArtifact(ARTIFACT_NAME, DYNAMIC_FILE_NAME, dynamicBundleSizes);

    if (issueNumber) {
      console.log('> Commenting on PR');
      const prefix = '### Bundle Sizes';
      const info = `Compared against ${masterBundleSizes.sha}`;

      const routesTable = getMarkdownTable(masterBundleSizes.data, bundleSizes, 'Route');
      const dynamicTable = getMarkdownTable(
        masterDynamicBundleSizes.data,
        dynamicBundleSizes,
        'Dynamic import',
      );
      const body = `${prefix}\n\n` + `${info}\n\n` + `${routesTable}\n\n` + `${dynamicTable}\n\n`;
      createOrReplaceComment(octokit, issueNumber, prefix, body);
    } else if (github.context.ref === `refs/heads/${baseBranch}`) {
      console.log('> Creating/updating bundle size issue');

      const routesTableNoDiff = getMarkdownTable([], bundleSizes, 'Route');
      const dynamicTableNoDiff = getMarkdownTable([], dynamicBundleSizes, 'Dynamic import');
      const bodyNoDiff = `${routesTableNoDiff}\n\n` + `${dynamicTableNoDiff}\n\n`;
      createOrReplaceIssue(octokit, bodyNoDiff);
    }
  } catch (e) {
    console.log(e);
    core.setFailed((e as { message?: any })?.message);
  }
}

run();
