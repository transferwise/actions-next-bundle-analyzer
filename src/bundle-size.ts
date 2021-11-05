import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

type BuildManifest = {
  pages: Record<string, string[]>;
};

type ReactLoadableManifest = Record<string, { id: string, file: string }[]>;

export type PageBundleSizes = { page: string; size: number }[];

export function getStaticBundleSizes(): PageBundleSizes {
  const manifest = loadBuildManifest();

  const pageSizes: PageBundleSizes = Object.entries(manifest.pages).map(([page, files]) => {
    const size = files
      .map((filename: string) => {
        const fn = path.join(process.cwd(), '.next', filename);
        const bytes = fs.readFileSync(fn);
        const gzipped = zlib.gzipSync(bytes);
        return gzipped.byteLength;
      })
      .reduce((s: number, b: number) => s + b, 0);

    return { page, size };
  });

  return pageSizes;
}

export function getDynamicBundleSizes(): PageBundleSizes {
  const staticManifest = loadBuildManifest();
  const manifest = loadReactLoadableManifest(staticManifest.pages['/_app']);

  const pageSizes: PageBundleSizes = Object.entries(manifest.pages).map(([page, files]) => {
    const size = files
      .map((filename: string) => {
        const fn = path.join(process.cwd(), '.next', filename);
        const bytes = fs.readFileSync(fn);
        const gzipped = zlib.gzipSync(bytes);
        return gzipped.byteLength;
      })
      .reduce((s: number, b: number) => s + b, 0);

    return { page, size };
  });

  return pageSizes;
}

function loadBuildManifest(): BuildManifest {
  const file = fs.readFileSync(path.join(process.cwd(), '.next', 'build-manifest.json'), 'utf-8');
  return JSON.parse(file);
}

function loadReactLoadableManifest(appChunks: string[]): BuildManifest {
  const file = fs.readFileSync(path.join(process.cwd(), '.next', 'react-loadable-manifest.json'), 'utf-8');
  const content = JSON.parse(file) as ReactLoadableManifest;
  const pages = {} as BuildManifest["pages"];
  Object.keys(content).map(item => {
    const fileList = content[item].map(({file}) => file);
    const uniqueFileList = Array.from(new Set(fileList));
    pages[item] = uniqueFileList.filter(file => !appChunks.find(chunkFile => file === chunkFile));
  });
  return {
    pages,
  }
}

export function getMarkdownTable(
  masterBundleSizes: PageBundleSizes = [],
  bundleSizes: PageBundleSizes,
  name: string = 'Route'
): string {
  // Produce a Markdown table with each page, its size and difference to master
  const sizes = bundleSizes
    .map(({ page, size }) => {
      const masterSize = masterBundleSizes.find((x) => x.page === page);
      const diffStr = masterSize ? formatBytes(size - masterSize.size, true) : 'added';
      return `| \`${page}\` | ${formatBytes(size)} | ${diffStr} |`;
    })
    .concat(
      masterBundleSizes
        .filter(({ page }) => !bundleSizes.find((x) => x.page === page))
        .map(({ page }) => `| \`${page}\` | removed |`),
    )
    .join('\n');

  if (!sizes) {
    return '';
  }

  return `| ${name} | Size (gzipped) | Diff |
  | --- | --- | --- |
  ${sizes}`;
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
