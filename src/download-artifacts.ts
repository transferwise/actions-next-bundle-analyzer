import AdmZip from 'adm-zip';
import * as github from '@actions/github';

import { Octokit } from './types';

export async function downloadArtifactAsJson(
  octokit: Octokit,
  branch: string,
  workflowId: string,
  artifactName: string,
  fileName: string
): Promise<any | null> {
  try {
    // Find latest workflow run on master
    console.log(
      `Fetching workflow runs for '${workflowId}' on branch '${branch}'...`
    );
    const runs = await octokit.rest.actions.listWorkflowRuns({
      ...github.context.repo,
      branch,
      workflow_id: workflowId,
      per_page: 1,
      status: 'success',
    });
    if (runs.data.workflow_runs.length === 0) {
      console.log(`Could not find any previous workflow runs`);
      return null;
    }

    // Find the bundle-size artifact on this workflow run
    console.log(
      `Fetching artifact information for run ${runs.data.workflow_runs[0].id}...`
    );
    const artifacts = await octokit.rest.actions.listWorkflowRunArtifacts({
      ...github.context.repo,
      run_id: runs.data.workflow_runs[0].id,
    });
    const bundleSizeArtifact = artifacts.data.artifacts.find(
      (artifact) => artifact.name === artifactName
    );
    if (!bundleSizeArtifact) {
      console.log(`Could not find bundle size artifact on run`);
      return null;
    }

    // Download a zip of the artifact and find the JSON file
    console.log(
      `Downloading artifact ZIP for artifact ${bundleSizeArtifact.id}...`
    );
    const zip = await octokit.rest.actions.downloadArtifact({
      ...github.context.repo,
      artifact_id: bundleSizeArtifact.id,
      archive_format: 'zip',
    });
    // @ts-expect-error zip.data is unknown
    const adm = new AdmZip(Buffer.from(zip.data));
    // @ts-ignore weird any type error from ncc
    const bundleSizeEntry = adm
      .getEntries()
      .find((entry) => entry.entryName === fileName);
    if (!bundleSizeEntry) {
      console.log(`Could not find file '${fileName}' in artifact`);
      return null;
    }

    // Parse and return the JSON
    return JSON.parse(bundleSizeEntry.getData().toString());
  } catch (e) {
    console.log('Failed to download artifacts', e);
    return null;
  }
}
