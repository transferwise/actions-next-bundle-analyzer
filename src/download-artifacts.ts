import AdmZip from 'adm-zip';
import { context } from '@actions/github';

import { Octokit } from './types';
import { PageBundleSizes } from './bundle-size';

const TOTAL_PAGES_LIMIT = 10;
const ARTIFACTS_PER_PAGE_LIMIT = 100;

async function findArtifactForBranch({
  octokit,
  branch,
  artifactName,
}: {
  octokit: Octokit;
  branch: string;
  artifactName: string;
}) {
  const artifactPageIterator = octokit.paginate.iterator(
    octokit.rest.actions.listArtifactsForRepo,
    {
      ...context.repo,
      name: artifactName,
      per_page: ARTIFACTS_PER_PAGE_LIMIT,
    },
  );
  let pageIndex = 0;
  for await (const { data: artifacts } of artifactPageIterator) {
    for (const artifact of artifacts) {
      if (artifact.workflow_run?.head_branch === branch) {
        return artifact;
      }
    }
    if (pageIndex++ >= TOTAL_PAGES_LIMIT) {
      console.log(`Artifact not found in last ${TOTAL_PAGES_LIMIT} pages`);
      break;
    }
  }
  return null;
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
      ...context.repo,
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
