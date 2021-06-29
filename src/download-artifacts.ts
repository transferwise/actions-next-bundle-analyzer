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
    const runs = await octokit.rest.actions.listWorkflowRuns({
      ...github.context.repo,
      branch,
      workflow_id: workflowId,
      per_page: 1,
    });
    if (runs.data.workflow_runs.length === 0) {
      return null;
    }

    // Find the bundle-size artifact on this workflow run
    const artifacts = await octokit.rest.actions.listWorkflowRunArtifacts({
      ...github.context.repo,
      run_id: runs.data.workflow_runs[0].id,
    });
    const bundleSizeArtifact = artifacts.data.artifacts.find(
      (artifact) => artifact.name === artifactName
    );
    if (!bundleSizeArtifact) {
      return null;
    }

    // Download a zip of the artifact and find the JSON file
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
      return null;
    }

    // Parse and return the JSON
    return JSON.parse(bundleSizeEntry.getData().toString());
  } catch (e) {
    console.log('Failed to download artifacts', e);
    return null;
  }
}
