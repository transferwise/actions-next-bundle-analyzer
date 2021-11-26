import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

type BuildManifest = {
  pages: Record<string, string[]>;
};

export type PageBundleSizes = { page: string; size: number }[];

export function getBundleSizes(): PageBundleSizes {
  const manifest = loadManifest();

  const pageSizes: PageBundleSizes = Object.entries(manifest.pages).map(
    ([page, files]) => {
      const size = files
        .map((filename: string) => {
          const fn = path.join(process.cwd(), '.next', filename);
          const bytes = fs.readFileSync(fn);
          const gzipped = zlib.gzipSync(bytes);
          return gzipped.byteLength;
        })
        .reduce((s: number, b: number) => s + b, 0);

      return { page, size };
    }
  );

  return pageSizes;
}

function loadManifest(): BuildManifest {
  const file = fs.readFileSync(
    path.join(process.cwd(), '.next', 'build-manifest.json'),
    'utf-8'
  );
  return JSON.parse(file);
}

export function getMarkdownTable(
  masterBundleSizes: PageBundleSizes,
  bundleSizes: PageBundleSizes
): string {
  // Produce a Markdown table with each page, its size and difference to master
  const rows = getPageChangeInfo(masterBundleSizes, bundleSizes);
  const significant = getSignificant(rows);

  if (significant.length > 0) {
    return formatTable(significant);
  }
  return 'No files significant changes found.';
}

type PageChangeInfo = {
  page: string;
  type: 'added' | 'changed' | 'removed';
  size: number;
  diff: number;
};

function getPageChangeInfo(
  masterBundleSizes: PageBundleSizes,
  bundleSizes: PageBundleSizes
): PageChangeInfo[] {
  const addedAndChanged: PageChangeInfo[] = bundleSizes.map(
    ({ page, size }) => {
      const masterSize = masterBundleSizes.find((x) => x.page === page);
      if (masterSize) {
        return {
          page,
          type: 'changed',
          size,
          diff: size - masterSize.size,
        };
      }
      return { page, type: 'added', size, diff: size };
    }
  );

  const removed: PageChangeInfo[] = masterBundleSizes
    .filter(({ page }) => !bundleSizes.find((x) => x.page === page))
    .map(({ page }) => ({ page, type: 'removed', size: 0, diff: 0 }));

  return addedAndChanged.concat(removed);
}

function getSignificant(rows: PageChangeInfo[]): PageChangeInfo[] {
  return rows.filter(
    ({ type, diff }) => type !== 'changed' || diff > 100 || diff < -100
  );
}

function formatTable(rows: PageChangeInfo[]): string {
  const rowStrs = rows.map(({ page, type, size, diff }) => {
    const diffStr = type === 'changed' ? formatBytes(diff, true) : type;
    return `| \`${page}\` | ${formatBytes(size)} | ${diffStr} |`;
  });

  return `| Route | Size (gzipped) | Diff |
  | --- | --- | --- |
  ${rowStrs.join('\n')}`;
}

function formatBytes(bytes: number, signed = false) {
  const sign = signed ? getSign(bytes) : '';
  if (bytes === 0) {
    return `no change`;
  }

  const k = 1024;
  const dm = 2;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return `${sign}${parseFloat(Math.abs(bytes / k ** i).toFixed(dm))} ${
    sizes[i]
  }`;
}

function getSign(bytes: number) {
  return bytes < 0 ? '-' : '+';
}
