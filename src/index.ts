import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { getStaticBundleSizes, getMarkdownTable } from './bundle-size';

import { createOrUpdateCommentPartially } from './comments';
import { createOrUpdateIssuePartially } from './issue';
import { downloadArtifactAsJson } from './download-artifacts';
import { uploadJsonAsArtifact } from './upload-artifacts';
import {
  createPartialBundleInfo,
  createPartialReferenceBundleInfo,
} from './create-partial-bundle-info';
import { determineAppName } from './determine-app-name';

const ARTIFACT_NAME_PREFIX = 'next-bundle-analyzer__';
const FILE_NAME = 'bundle-sizes.json';
const COMMENT_TITLE = '## Bundle Sizes';

async function run() {
  try {
    const workingDir = core.getInput('working-directory');
    const token = core.getInput('github-token');
    const appName = determineAppName(workingDir);
    const artifactName = `${ARTIFACT_NAME_PREFIX}${appName}`;

    const octokit = getOctokit(token);

    const {
      data: { default_branch },
    } = await octokit.rest.repos.get({ ...context.repo });

    const issueNumber = context.payload.pull_request?.number;

    console.log(`> Downloading bundle sizes from ${default_branch}`);
    const referenceBundleSizes = (await downloadArtifactAsJson(
      octokit,
      default_branch,
      artifactName,
      FILE_NAME,
    )) || { sha: 'none', data: [] };
    console.log(referenceBundleSizes);

    console.log('> Calculating local bundle sizes');
    const bundleSizes = getStaticBundleSizes(workingDir);
    console.log(bundleSizes);

    console.log('> Uploading local bundle sizes');
    await uploadJsonAsArtifact(artifactName, FILE_NAME, bundleSizes);

    if (issueNumber) {
      console.log('> Commenting on PR');
      const body = createPartialBundleInfo({
        appName,
        referenceSha: referenceBundleSizes.sha,
        referenceBundleSizes: referenceBundleSizes.data,
        actualBundleSizes: bundleSizes,
      });
      createOrUpdateCommentPartially({
        octokit,
        issueNumber,
        appName,
        title: COMMENT_TITLE,
        body,
      });
    } else if (context.ref === `refs/heads/${default_branch}`) {
      console.log('> Creating/updating bundle size issue');
      const body = createPartialReferenceBundleInfo({
        appName,
        actualBundleSizes: bundleSizes,
      });
      createOrUpdateIssuePartially({
        octokit,
        appName,
        body,
      });
    }
  } catch (e) {
    console.log(e);
    core.setFailed((e as { message?: any })?.message);
  }
}

run();
