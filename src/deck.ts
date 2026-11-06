import { type Dirent, readdirSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { imageExtensions, limits, textExtensions } from '@tarot/config';
import { GeneratorError } from '@tarot/errors';
import { readTextFile } from '@tarot/files';

/** One tarot card: a name, a text, and an image. */
export type Card = {
  /** The card name, from the file name without the extension, for example `The Fool`. */
  readonly name: string;
  /** The card text in Markdown, trimmed, with LF line endings. */
  readonly text: string;
  /** The image path relative to the repository root, with `/` separators. */
  readonly imagePath: string;
};

export type Deck = {
  readonly cards: readonly Card[];
  /** Card texts without an image. The generator does not use them. */
  readonly textsWithoutImage: readonly string[];
  /** Images without a card text. The generator does not use them. */
  readonly imagesWithoutText: readonly string[];
};

// Letters, digits, spaces, and common punctuation. This excludes characters with a special meaning in HTML and in Markdown links.
const cardNamePattern = /^[\p{L}\p{N}][\p{L}\p{N} '’.,()&_-]*$/u;

export function isValidCardName(name: string): boolean {
  return name.length <= 100 && cardNamePattern.test(name) && name.trim() === name;
}

/** The key that pairs a text with an image. The comparison ignores letter case and Unicode normalization. */
function cardKey(name: string): string {
  return name.normalize('NFC').toLowerCase();
}

type AssetFile = { readonly name: string; readonly path: string };

/** List the regular files in the assets directory and its subdirectories. Links and hidden entries are skipped. */
function listFiles(root: string, assetsDir: string): AssetFile[] {
  const files: AssetFile[] = [];
  let entries = 0;
  const visit = (directory: string, depth: number): void => {
    if (depth > limits.assetDepth) throw new GeneratorError(`The assets directory is deeper than ${limits.assetDepth} levels: ${relative(root, directory)}`);
    let items: Dirent[];
    try {
      items = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT' && depth === 0) throw new GeneratorError(`The assets directory is not found: ${relative(root, directory)}`);
      throw error;
    }
    items.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const item of items) {
      entries += 1;
      if (entries > limits.assetEntries) throw new GeneratorError(`The assets directory has more than ${limits.assetEntries} entries.`);
      if (item.name.startsWith('.')) continue;
      const path = join(directory, item.name);
      if (item.isDirectory()) visit(path, depth + 1);
      else if (item.isFile()) files.push({ name: item.name, path });
    }
  };
  visit(join(root, assetsDir), 0);
  return files;
}

function withoutExtension(name: string): string {
  return name.slice(0, name.length - extname(name).length);
}

/**
 * Load the deck from the assets directory. A card is a text file and an image file with the same name, for example
 * `The Fool.md` and `The Fool.png`. The two files can be in different subdirectories.
 * A text without an image, or an image without a text, is not a card. The result lists these files.
 */
export function loadDeck(root: string, assetsDir: string): Deck {
  const texts = new Map<string, AssetFile>();
  const images = new Map<string, AssetFile>();
  for (const file of listFiles(root, assetsDir)) {
    const extension = extname(file.name).toLowerCase();
    const target = textExtensions.includes(extension) ? texts : imageExtensions.includes(extension) ? images : undefined;
    if (!target) continue;
    const name = withoutExtension(file.name);
    const key = cardKey(name);
    const other = target.get(key);
    if (other) throw new GeneratorError(`Two files have the same card name "${name}": ${relative(root, other.path)} and ${relative(root, file.path)}`);
    target.set(key, file);
  }

  const cards: Card[] = [];
  const textsWithoutImage: string[] = [];
  for (const [key, file] of texts) {
    const name = withoutExtension(file.name);
    const path = relative(root, file.path);
    if (!isValidCardName(name)) throw new GeneratorError(`The card name is not valid: ${JSON.stringify(name)}. Use letters, digits, spaces, and ' . , ( ) & _ -.`);
    const image = images.get(key);
    if (!image) {
      textsWithoutImage.push(path.split(sep).join('/'));
      continue;
    }
    const text = (readTextFile(file.path, limits.cardTextBytes) ?? '').trim();
    if (text === '') throw new GeneratorError(`The card text is empty: ${path}`);
    cards.push({ name, text, imagePath: relative(root, image.path).split(sep).join('/') });
  }
  if (cards.length === 0) throw new GeneratorError(`The assets directory has no complete cards (a text and an image with the same name): ${assetsDir}`);

  const imagesWithoutText = [...images.keys()]
    .filter((key) => !texts.has(key))
    .map((key) =>
      relative(root, images.get(key)?.path ?? '')
        .split(sep)
        .join('/')
    )
    .sort();
  cards.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { cards, textsWithoutImage: textsWithoutImage.sort(), imagesWithoutText };
}
