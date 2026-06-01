const REPO = 'treplica/treplica';
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  download_count: number;
  size: number;
}

export interface ReleaseInfo {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  assets: ReleaseAsset[];
}

export interface DownloadUrls {
  windows: string;
  macos: string;
  releases: string;
  repo: string;
}

export async function getLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;
    return res.json() as Promise<ReleaseInfo>;
  } catch {
    return null;
  }
}

export function getDownloadUrls(release: ReleaseInfo | null): DownloadUrls {
  const repo = `https://github.com/${REPO}`;

  if (!release || release.assets.length === 0) {
    return { windows: RELEASES_URL, macos: RELEASES_URL, releases: RELEASES_URL, repo };
  }

  const windows = release.assets.find(
    (a) => a.name.endsWith('.msi') || a.name.endsWith('.exe')
  )?.browser_download_url ?? RELEASES_URL;

  const macos = release.assets.find(
    (a) => a.name.endsWith('.dmg')
  )?.browser_download_url ?? RELEASES_URL;

  return { windows, macos, releases: release.html_url, repo };
}
