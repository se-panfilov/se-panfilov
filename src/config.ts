/** Repository paths and fixed settings of the README generator. Paths are relative to the repository root. */
export const defaultPaths = {
  assets: 'assets',
  template: 'templates/README.template.md',
  output: 'README.md'
} as const;

/** The time zone of the daily reading. The GitHub Actions schedule uses the same zone. */
export const timeZone = 'Europe/Amsterdam';

export const textExtensions: readonly string[] = ['.md', '.txt'];
export const imageExtensions: readonly string[] = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg'];

/** Limits for repository files that the generator reads. */
export const limits = {
  cardTextBytes: 16 * 1024,
  templateBytes: 256 * 1024,
  readmeBytes: 1024 * 1024,
  assetEntries: 10000,
  assetDepth: 8
} as const;

/** The display width of the card image in pixels. */
export const imageWidth = 300;
