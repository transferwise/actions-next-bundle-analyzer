import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import {
  getComparisonMarkdownTable,
  getSingleColumnMarkdownTable,
  getStaticBundleSizes,
} from './bundle-size';

import { createOrReplaceComment } from './comments';
import { determineAppName } from './determine-app-name';
import { downloadArtifactAsJson } from './download-artifacts';
import { getInputs } from './input-helper';
import { createOrReplaceIssue } from './issue';
import { uploadJsonAsArtifact } from './upload-artifacts';

const ARTIFACT_NAME_PREFIX = 'next-bundle-analyzer__';
const FILE_NAME = 'bundle-sizes.json';

async function run() {
  try {
    const inputs = getInputs();
    const appName = determineAppName(inputs.workingDirectory);
    const artifactName = `${ARTIFACT_NAME_PREFIX}${appName}`;

    const octokit = getOctokit(inputs.githubToken);

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
    const bundleSizes = getStaticBundleSizes(inputs.workingDirectory);
    console.log(bundleSizes);

    console.log('> Uploading local bundle sizes');
    await uploadJsonAsArtifact(artifactName, FILE_NAME, bundleSizes);

    if (issueNumber) {
      const title = `### Bundle sizes [${appName}]`;
      const shaInfo = `Compared against ${referenceBundleSizes.sha}`;
      const routesTable = getComparisonMarkdownTable({
        referenceBundleSizes: referenceBundleSizes.data,
        actualBundleSizes: bundleSizes,
        name: 'Route',
      });
      createOrReplaceComment({
        octokit,
        issueNumber,
        title,
        shaInfo,
        routesTable,
        strategy: inputs.commentStrategy,
      });
    } else if (context.ref === `refs/heads/${default_branch}`) {
      console.log('> Creating/updating bundle size issue');
      const title = `Bundle sizes [${appName}]`;
      const routesTable = getSingleColumnMarkdownTable({ bundleSizes, name: 'Route' });
      createOrReplaceIssue({
        octokit,
        title,
        routesTable,
      });
    }
  } catch (e) {
    console.log(e);
    core.setFailed((e as { message?: any })?.message);
  }
}

run();
