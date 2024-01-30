import { DefaultArtifactClient } from '@actions/artifact';
import * as fs from 'fs';
import * as tmp from 'tmp';

export async function uploadJsonAsArtifact(
  artifactName: string,
  fileName: string,
  data: any,
): Promise<void> {
  const artifactClient = new DefaultArtifactClient();

  const dir = tmp.dirSync();
  const file = tmp.fileSync({ name: fileName, dir: dir.name });

  fs.writeFileSync(file.name, JSON.stringify(data, null, 2));

  console.log(`Uploading ${file.name}`);
  const response = await artifactClient.uploadArtifact(artifactName, [file.name], dir.name);
  console.log('Artifact uploaded', response);
}
