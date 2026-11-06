/** Repository paths and fixed settings of the README generator. Paths are relative to the repository root. */
export const defaultPaths = {
  assets: 'assets',
  template: 'templates/README.template.md',
  output: 'README.md',
  /** The symbol images for `<!-- tarot:key:SYMBOL:SIZE -->`. */
  images: 'images'
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
  assetDepth: 8,
  imageEntries: 10000
} as const;

/** The symbol image variant of the `system` style, for example `a_5.svg`. Random variants do not use it. */
export const systemVariant = 5;
