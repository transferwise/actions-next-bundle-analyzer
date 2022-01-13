import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

type BuildManifest = {
  pages: Record<string, string[]>;
};

type ReactLoadableManifest = Record<string, Next10Chunks | Next12Chunks>;
type Next10Chunks = { id: string; file: string }[];
type Next12Chunks = { id: string; files: string[] };

export type PageBundleSizes = { page: string; size: number }[];

export function getStaticBundleSizes(workingDir: string): PageBundleSizes {
  const manifest = loadBuildManifest(workingDir);

  return getPageSizesFromManifest(manifest,workingDir);
}

export function getDynamicBundleSizes(workingDir: string): PageBundleSizes {
  const staticManifest = loadBuildManifest(workingDir);
  const manifest = loadReactLoadableManifest(staticManifest.pages['/_app'], workingDir);

  return getPageSizesFromManifest(manifest, workingDir);
}

function getPageSizesFromManifest(manifest: BuildManifest,workingDir: string): PageBundleSizes {
  return Object.entries(manifest.pages).map(([page, files]) => {
    const size = files
      .map((filename: string) => {
        const fn = path.join(process.cwd(), workingDir,'.next', filename);
        const bytes = fs.readFileSync(fn);
        const gzipped = zlib.gzipSync(bytes);
        return gzipped.byteLength;
      })
      .reduce((s: number, b: number) => s + b, 0);

    return { page, size };
  });
}

function loadBuildManifest(workingDir: string): BuildManifest {
  const file = fs.readFileSync(path.join(process.cwd(), workingDir, '.next', 'build-manifest.json'), 'utf-8');
  return JSON.parse(file);
}

function loadReactLoadableManifest(appChunks: string[], workingDir: string): BuildManifest {
  const file = fs.readFileSync(
    path.join(process.cwd(), workingDir, '.next', 'react-loadable-manifest.json'),
    'utf-8',
  );
  const content = JSON.parse(file) as ReactLoadableManifest;
  const pages = {} as BuildManifest['pages'];
  Object.keys(content).map((item) => {
    const fileList = getFiles(content[item]);
    const uniqueFileList = Array.from(new Set(fileList));
    pages[item] = uniqueFileList.filter(
      (file) => !appChunks.find((chunkFile) => file === chunkFile),
    );
  });
  return {
    pages,
  };
}

function getFiles(chunks: Next10Chunks | Next12Chunks): string[] {
  if ((chunks as Next12Chunks).files) {
    return (chunks as Next12Chunks).files;
  }
  return (chunks as Next10Chunks).map(({ file }) => file);
}

export function getMarkdownTable(
  masterBundleSizes: PageBundleSizes = [],
  bundleSizes: PageBundleSizes,
  name: string = 'Route',
): string {
  // Produce a Markdown table with each page, its size and difference to master
  const rows = getPageChangeInfo(masterBundleSizes, bundleSizes);
  if (rows.length === 0) {
    return `${name}: None found.`;
  }

  const significant = getSignificant(rows);
  if (significant.length > 0) {
    return formatTable(name, significant);
  }
  return `${name}: No significant changes found`;
}

type PageChangeInfo = {
  page: string;
  type: 'added' | 'changed' | 'removed';
  size: number;
  diff: number;
};

function getPageChangeInfo(
  masterBundleSizes: PageBundleSizes,
  bundleSizes: PageBundleSizes,
): PageChangeInfo[] {
  const addedAndChanged: PageChangeInfo[] = bundleSizes.map(({ page, size }) => {
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
  });

  const removed: PageChangeInfo[] = masterBundleSizes
    .filter(({ page }) => !bundleSizes.find((x) => x.page === page))
    .map(({ page }) => ({ page, type: 'removed', size: 0, diff: 0 }));

  return addedAndChanged.concat(removed);
}

function getSignificant(rows: PageChangeInfo[]): PageChangeInfo[] {
  return rows.filter(({ type, diff }) => type !== 'changed' || diff >= 1000 || diff <= -1000);
}

function formatTable(name: string, rows: PageChangeInfo[]): string {
  const rowStrs = rows.map(({ page, type, size, diff }) => {
    const diffStr = type === 'changed' ? formatBytes(diff, true) : type;
    return `| \`${page}\` | ${formatBytes(size)} | ${diffStr} |`;
  });

  return `| ${name} | Size (gzipped) | Diff |
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

  return `${sign}${parseFloat(Math.abs(bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

function getSign(bytes: number) {
  return bytes < 0 ? '-' : '+';
}
