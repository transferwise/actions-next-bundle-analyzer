import AdmZip from 'adm-zip';
import * as github from '@actions/github';

import { Octokit } from './types';
import { PageBundleSizes } from './bundle-size';

async function findArtifactForBranch({
  octokit,
  branch,
  artifactName,
}: {
  octokit: Octokit;
  branch: string;
  artifactName: string;
}) {
  // TODO: Paginate
  const { data } = await octokit.rest.actions.listArtifactsForRepo({
    ...github.context.repo,
    name: artifactName,
  });
  const [matchingArtifact] = data.artifacts
    .filter((artifact) => artifact.workflow_run?.head_branch === branch)
    .sort((a, b) => {
      const aDate = new Date(a.created_at ?? 0);
      const bDate = new Date(b.created_at ?? 0);
      return aDate.getTime() - bDate.getTime();
    });
  return matchingArtifact ?? null;
}

export async function downloadArtifactAsJson(
  octokit: Octokit,
  branch: string,
  artifactName: string,
  fileName: string,
): Promise<{ sha: string; data: PageBundleSizes } | null> {
  try {
    const bundleSizeArtifact = await findArtifactForBranch({
      octokit,
      branch,
      artifactName,
    });

    if (!bundleSizeArtifact) {
      console.log(`Could not find bundle size artifact on run`);
      return null;
    }

    // Download a zip of the artifact and find the JSON file
    console.log(`Downloading artifact ZIP for artifact ${bundleSizeArtifact.id}...`);
    const zip = await octokit.rest.actions.downloadArtifact({
      ...github.context.repo,
      artifact_id: bundleSizeArtifact.id,
      archive_format: 'zip',
    });
    // @ts-expect-error zip.data is unknown
    const adm = new AdmZip(Buffer.from(zip.data));
    // @ts-ignore weird any type error from ncc
    const bundleSizeEntry = adm.getEntries().find((entry) => entry.entryName === fileName);
    if (!bundleSizeEntry) {
      console.log(`Could not find file '${fileName}' in artifact`);
      return null;
    }

    // Parse and return the JSON
    return {
      sha: bundleSizeArtifact.workflow_run?.head_sha!,
      data: JSON.parse(bundleSizeEntry.getData().toString()),
    };
  } catch (e) {
    console.log('Failed to download artifacts', e);
    return null;
  }
}
