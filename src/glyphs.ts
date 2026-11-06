import { type Dirent, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { limits, systemVariant } from '@tarot/config';
import { GeneratorError } from '@tarot/errors';
import { type RandomIndex, secureRandomIndex } from '@tarot/pick';
import { encodePath, escapeHtml, type KeyPlaceholder } from '@tarot/template';

/** The file names of the special symbols. A letter uses its lowercase form, and a digit uses itself. */
export const symbolFileNames: Readonly<Record<string, string>> = { '!': 'excl', '?': 'question', '#': 'hash', '@': 'at', '.': 'dot', ',': 'comma' };

/** The file name of a symbol without the variant and the extension, for example `a`, `5`, or `excl`. */
export function symbolFileName(symbol: string): string | undefined {
  if (/^[A-Za-z0-9]$/.test(symbol)) return symbol.toLowerCase();
  return Object.hasOwn(symbolFileNames, symbol) ? symbolFileNames[symbol] : undefined;
}

/** The image paths of each symbol, relative to the repository root. The key is the symbol file name. */
export type Glyphs = ReadonlyMap<string, readonly string[]>;

// `a_1.svg` is variant 1 of `a`. `a.svg` is the only image of `a`, when `a` has no numbered variants.
const glyphFilePattern = /^([a-z0-9]+)(?:_([1-9]\d?))?\.svg$/;

/**
 * Find the symbol images in a directory. Links, subdirectories, and other files are skipped.
 * Without `variant`, the result has the random variants: all numbered variants except the `system` variant.
 * With `variant`, the result has only the files of this variant, for example `a_5.svg`.
 */
export function loadGlyphs(root: string, imagesDir: string, variant?: number): Glyphs {
  let items: Dirent[];
  try {
    items = readdirSync(join(root, imagesDir), { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new GeneratorError(`The symbol image directory is not found: ${imagesDir}`);
    throw error;
  }
  if (items.length > limits.imageEntries) throw new GeneratorError(`The symbol image directory has more than ${limits.imageEntries} entries.`);
  const numbered = new Map<string, { variant: number; path: string }[]>();
  const single = new Map<string, string>();
  for (const item of items) {
    const match = item.isFile() ? glyphFilePattern.exec(item.name) : null;
    if (!match?.[1]) continue;
    const path = `${imagesDir}/${item.name}`;
    if (variant !== undefined) {
      if (match[2] !== undefined && Number(match[2]) === variant) single.set(match[1], path);
      continue;
    }
    if (match[2] === undefined) single.set(match[1], path);
    else if (Number(match[2]) !== systemVariant) numbered.set(match[1], [...(numbered.get(match[1]) ?? []), { variant: Number(match[2]), path }]);
  }
  const glyphs = new Map<string, readonly string[]>();
  for (const [name, path] of single) glyphs.set(name, [path]);
  for (const [name, variants] of numbered)
    glyphs.set(
      name,
      variants.sort((a, b) => a.variant - b.variant).map((item) => item.path)
    );
  return glyphs;
}

/** Put the items into a random order (Fisher-Yates). */
function shuffle<T>(items: readonly T[], random: RandomIndex): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = random(index + 1);
    if (!Number.isInteger(other) || other < 0 || other > index) throw new Error(`The random source returned an index outside the range [0, ${index + 1}).`);
    [result[index], result[other]] = [result[other] as T, result[index] as T];
  }
  return result;
}

/**
 * Make a function that returns the `<img>` element for a symbol placeholder. Each symbol takes its variants in a random
 * order, so that the same symbol shows a different variant each time until all variants are used.
 * Then a new random order starts. It does not start with the variant that was used last.
 */
export function createKeyRenderer(glyphs: Glyphs, cacheKey: string, random: RandomIndex = secureRandomIndex, systemGlyphs: Glyphs = new Map()): (key: KeyPlaceholder) => string {
  const queues = new Map<string, string[]>();
  const last = new Map<string, string>();
  // GitHub puts each image into a link to the image file, but not an image in a <picture> element.
  // Thus the symbol image is not clickable.
  const image = (path: string, size: number, symbol: string): string => `<picture><img src="${escapeHtml(encodePath(path))}?v=${cacheKey}" width="${size}" alt="${escapeHtml(symbol)}"></picture>`;
  return ({ symbol, size, system }) => {
    const name = symbolFileName(symbol);
    if (system) {
      const path = name === undefined ? undefined : systemGlyphs.get(name)?.[0];
      if (path === undefined) throw new GeneratorError(`No system image for the symbol "${symbol}". Add ${name ?? symbol}_${systemVariant}.svg to the symbol image directory.`);
      return image(path, size, symbol);
    }
    const variants = name === undefined ? undefined : glyphs.get(name);
    if (name === undefined || !variants?.length) throw new GeneratorError(`No image for the symbol "${symbol}". Add ${name ?? symbol}_1.svg or ${name ?? symbol}.svg to the symbol image directory.`);
    const queueKey = name;
    let queue = queues.get(queueKey);
    if (!queue?.length) {
      queue = shuffle(variants, random);
      const previous = last.get(queueKey);
      if (queue.length > 1 && queue[0] === previous) queue.push(queue.shift() as string);
      queues.set(queueKey, queue);
    }
    const path = queue.shift() as string;
    last.set(queueKey, path);
    return image(path, size, symbol);
  };
}
