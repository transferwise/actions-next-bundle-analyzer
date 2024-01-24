import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { getStaticBundleSizes } from './bundle-size';

import { createOrReplaceComment } from './comments';
import { determineAppName } from './determine-app-name';
import { downloadArtifactAsJson } from './download-artifacts';
import { createOrReplaceIssue } from './issue';
import { uploadJsonAsArtifact } from './upload-artifacts';

const ARTIFACT_NAME_PREFIX = 'next-bundle-analyzer__';
const FILE_NAME = 'bundle-sizes.json';

async function run() {
  try {
    const workingDir = core.getInput('working-directory');
    const token = core.getInput('github-token');
    const appName = determineAppName(workingDir);
    const artifactName = `${ARTIFACT_NAME_PREFIX}${appName}`;

    const octokit = getOctokit(token);

    const {
      data: { default_branch },
    } = await octokit.rest.repos.get(context.repo);

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
      createOrReplaceComment({
        octokit,
        issueNumber,
        appName,
        referenceSha: referenceBundleSizes.sha,
        referenceBundleSizes: referenceBundleSizes.data,
        actualBundleSizes: bundleSizes,
      });
    } else if (context.ref === `refs/heads/${default_branch}`) {
      console.log('> Creating/updating bundle size issue');
      createOrReplaceIssue({
        octokit,
        appName,
        actualBundleSizes: bundleSizes,
      });
    }
  } catch (e) {
    console.log(e);
    core.setFailed((e as { message?: any })?.message);
  }
}

run();
