import * as core from '@actions/core';
import * as github from '@actions/github';
import {
  getBundleSizes,
  getMarkdownTable,
  PageBundleSizes,
} from './bundle-size';

import { createOrReplaceComment } from './comments';
import { downloadArtifactAsJson } from './download-artifacts';
import { uploadJsonAsArtifact } from './upload-artifacts';

const ARTIFACT_NAME = 'next-bundle-analyzer';
const FILE_NAME = 'bundle-sizes.json';

async function run() {
  try {
    const workflowId = core.getInput('workflow-id', { required: true });
    const baseBranch = core.getInput('base-branch') || 'master';

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN || '');
    const issueNumber = github.context.payload.pull_request?.number;

    console.log(`> Downloading bundle sizes from ${baseBranch}`);
    const masterBundleSizes = (await downloadArtifactAsJson(
      octokit,
      baseBranch,
      workflowId,
      ARTIFACT_NAME,
      FILE_NAME
    )) || { sha: 'none', data: [] };
    console.log(masterBundleSizes);

    console.log('> Calculating local bundle sizes');
    const bundleSizes = getBundleSizes();
    console.log(bundleSizes);

    console.log('> Uploading local bundle sizes');
    await uploadJsonAsArtifact(ARTIFACT_NAME, FILE_NAME, bundleSizes);

    console.log('> Commenting on PR');
    if (issueNumber) {
      const prefix = '### Bundle Sizes';
      const info = `Compared against ${masterBundleSizes.sha}`;
      const markdownTable = getMarkdownTable(
        masterBundleSizes.data,
        bundleSizes
      );
      const body = `${prefix}\n\n${info}\n\n${markdownTable}`;
      createOrReplaceComment(octokit, issueNumber, prefix, body);
    }
  } catch (e) {
    console.log(e);
    core.setFailed(e.message);
  }
}

run();
