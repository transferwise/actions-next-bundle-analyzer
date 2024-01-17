import { PageBundleSizes, getMarkdownTable } from './bundle-size';
import { formatTextFragments } from './comments';

export function createPartialBundleInfo({
  appName,
  referenceSha,
  referenceBundleSizes,
  actualBundleSizes,
}: {
  appName: string;
  referenceSha: string;
  referenceBundleSizes: PageBundleSizes;
  actualBundleSizes: PageBundleSizes;
}): string {
  const title = `### Bundle sizes for ${appName}`;
  const info = `Compared against ${referenceSha}`;
  const routesTable = getMarkdownTable(referenceBundleSizes, actualBundleSizes, 'Route');
  return formatTextFragments(title, info, routesTable);
}
