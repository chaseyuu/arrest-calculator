// Static-hosting version: the GTAW datasets are bundled with the site under
// public/data/gtaw-data (copied from data/gtaw-data by scripts/copy-data.js),
// so the calculator works on GitHub Pages without any server or external CDN.
export type GtawDataFile = 'gtaw_penal_code.json' | 'gtaw_depa_categories.json';

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function getGtawDataUrl(file: GtawDataFile): string {
  return `${basePath}/data/gtaw-data/${file}`;
}

export function fetchGtawData(file: GtawDataFile): Promise<Response> {
  return fetch(getGtawDataUrl(file));
}
