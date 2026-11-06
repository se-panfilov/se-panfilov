import { type Card } from '@tarot/deck';
import { GeneratorError } from '@tarot/errors';

/**
 * Template placeholders. A placeholder is an HTML comment, so a template stays valid Markdown:
 * `<!-- tarot:image -->`, `<!-- tarot:text -->`, `<!-- tarot:name -->`, `<!-- tarot:date -->`, and `<!-- tarot:cacheKey -->`.
 * Each placeholder also has a second form, `{{tarot:name}}`, for places where an HTML comment looks wrong,
 * for example in an HTML attribute.
 * `<!-- tarot:cacheKey -->` gives the cache key of the run. Use it in other image links, for example
 * `<img src="images/capri.png?v={{tarot:cacheKey}}" alt="Capri">`.
 * `<!-- tarot:key:SYMBOL:SIZE -->` gives the image of one symbol, for example `<!-- tarot:key:a:24 -->`. See `@tarot/glyphs`.
 * `<!-- tarot:date:STYLE:SIZE -->` gives the date as symbol images, for example `<!-- tarot:date:capri:24 -->`.
 * The images always come from `images/`. STYLE is a label only, but the `system` style always uses variant 5
 * (`a_5.svg`) instead of a random variant.
 */
export const placeholders = ['image', 'text', 'name', 'date', 'cacheKey'] as const;
export type Placeholder = (typeof placeholders)[number];

/** The number of times each placeholder can occur. One reading shows exactly one card image and one card text. */
const occurrences: Record<Placeholder, { readonly min: number; readonly max: number }> = {
  image: { min: 1, max: 1 },
  text: { min: 1, max: 1 },
  name: { min: 0, max: Infinity },
  date: { min: 0, max: Infinity },
  cacheKey: { min: 0, max: Infinity }
};

// The two forms of a placeholder: `<!-- tarot:name -->` and `{{tarot:name}}`.
const placeholderPattern = /<!--\s*tarot:([A-Za-z0-9_:!?#@.,-]*)\s*-->|\{\{\s*tarot:([A-Za-z0-9_:!?#@.,-]*)\s*\}\}/g;

/** A symbol placeholder: `key`, one letter, digit, or symbol, and the image width in pixels (1 to 1000). */
const keyPattern = /^key:([A-Za-z0-9!?#@.,]):([1-9]\d{0,3})$/;
const maxKeySize = 1000;

export type KeyPlaceholder = {
  readonly symbol: string;
  readonly size: number;
  /** Use the fixed variant of the `system` style instead of a random variant. */
  readonly system?: boolean | undefined;
};

/** The date style that uses the fixed variant. */
export const systemStyle = 'system';

/** A date placeholder with symbol images: `date`, the style, and the image width in pixels. */
const styledDatePattern = /^date:([a-z0-9][a-z0-9_-]{0,31}):([1-9]\d{0,3})$/;

export type StyledDatePlaceholder = { readonly style: string; readonly size: number };

/** Parse the name of a date placeholder with symbol images, for example `date:capri:24`. Returns undefined for other names. */
export function parseStyledDate(name: string): StyledDatePlaceholder | undefined {
  const match = styledDatePattern.exec(name);
  if (!match?.[1] || !match[2]) return undefined;
  const size = Number(match[2]);
  return size <= maxKeySize ? { style: match[1], size } : undefined;
}

/** True when the template has placeholders that use symbol images. */
export function usesSymbolImages(template: string): boolean {
  for (const match of template.matchAll(placeholderPattern)) {
    const name = match[1] ?? match[2] ?? '';
    if (parseKey(name) || parseStyledDate(name)) return true;
  }
  return false;
}

/** Parse the name of a symbol placeholder, for example `key:a:24`. Returns undefined for other names. */
export function parseKey(name: string): KeyPlaceholder | undefined {
  const match = keyPattern.exec(name);
  if (!match?.[1] || !match[2]) return undefined;
  const size = Number(match[2]);
  return size <= maxKeySize ? { symbol: match[1], size } : undefined;
}

/** The symbol placeholders in a template, in order. */
export function keyPlaceholders(template: string): KeyPlaceholder[] {
  const keys: KeyPlaceholder[] = [];
  for (const match of template.matchAll(placeholderPattern)) {
    const key = parseKey(match[1] ?? match[2] ?? '');
    if (key) keys.push(key);
  }
  return keys;
}

function isPlaceholder(value: string): value is Placeholder {
  return (placeholders as readonly string[]).includes(value);
}

/** Check the placeholders in a template. Returns a list of problems. An empty list means that the template is valid. */
export function templateProblems(template: string): string[] {
  const problems: string[] = [];
  const counts = new Map<Placeholder, number>();
  for (const match of template.matchAll(placeholderPattern)) {
    const name = match[1] ?? match[2] ?? '';
    if (name.startsWith('key:')) {
      if (!parseKey(name))
        problems.push(
          `The placeholder "${match[0]}" is not valid. Use <!-- tarot:key:SYMBOL:SIZE -->: one letter, digit, or one of ! ? # @ . , and a width from 1 to ${maxKeySize}, for example <!-- tarot:key:a:24 -->.`
        );
      continue;
    }
    if (name.startsWith('date:')) {
      if (!parseStyledDate(name))
        problems.push(
          `The placeholder "${match[0]}" is not valid. Use <!-- tarot:date:STYLE:SIZE -->: a style of lowercase letters, digits, _ and -, and a width from 1 to ${maxKeySize}, for example <!-- tarot:date:capri:24 -->.`
        );
      continue;
    }
    if (!isPlaceholder(name)) {
      problems.push(
        `Unknown placeholder "${match[0]}". Known placeholders: ${placeholders.map((item) => `<!-- tarot:${item} -->`).join(', ')}, <!-- tarot:key:SYMBOL:SIZE -->, <!-- tarot:date:STYLE:SIZE -->.`
      );
      continue;
    }
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const name of placeholders) {
    const count = counts.get(name) ?? 0;
    const { min, max } = occurrences[name];
    if (count < min || count > max) {
      const expected = min === max ? `exactly ${min}` : `at least ${min}`;
      problems.push(`The placeholder <!-- tarot:${name} --> must occur ${expected} time(s). It occurs ${count} time(s).`);
    }
  }
  return problems;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Encode each path segment, so that names with spaces work in links. */
export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

const cacheKeyPattern = /^[A-Za-z0-9]{1,64}$/;

/** Stop when the cache key is not 1 to 64 ASCII letters or digits, so that it is safe in an HTML attribute. */
export function assertCacheKey(cacheKey: string): void {
  if (!cacheKeyPattern.test(cacheKey)) throw new Error('The cache key must have 1 to 64 ASCII letters or digits.');
}

/**
 * Make the `<img>` element. The cache key goes into the query string, so that browsers and the GitHub image proxy
 * load the image again after each run.
 */
export function renderImage(card: Card, cacheKey: string): string {
  assertCacheKey(cacheKey);
  return `<img src="${escapeHtml(encodePath(card.imagePath))}?v=${cacheKey}" alt="${escapeHtml(card.name)}">`;
}

/** Make symbol images for each letter and digit of a text. Spaces stay. Other characters are kept as escaped text. */
export function renderSymbols(text: string, size: number, renderKey: (key: KeyPlaceholder) => string, system = false): string {
  return text.replace(/[A-Za-z0-9]|[^A-Za-z0-9]+/g, (part) => (/^[A-Za-z0-9]$/.test(part) ? renderKey({ symbol: part, size, system }) : escapeHtml(part)));
}

export type RenderValues = {
  /** The date of the reading. */
  readonly date: string;
  /** A random value for the image query string. */
  readonly cacheKey: string;
  /** Makes the image of one symbol placeholder. Necessary only when the template has symbol placeholders. */
  readonly renderKey?: ((key: KeyPlaceholder) => string) | undefined;
};

/**
 * Put the card into the template. All placeholders are replaced in one pass.
 * Thus text from a card file cannot add placeholders or change other parts of the template.
 */
export function renderTemplate(template: string, card: Card, { date, cacheKey, renderKey }: RenderValues): string {
  const problems = templateProblems(template);
  if (problems.length) throw new GeneratorError(`The template is not valid:\n- ${problems.join('\n- ')}`);
  const values: Record<Placeholder, string> = { image: renderImage(card, cacheKey), text: card.text, name: card.name, date, cacheKey };
  return template.replace(placeholderPattern, (_match, comment: string | undefined, braces: string | undefined) => {
    const name = comment ?? braces ?? '';
    if (isPlaceholder(name)) return values[name];
    const key = parseKey(name);
    const styledDate = parseStyledDate(name);
    if (!key && !styledDate) return '';
    if (!renderKey) throw new GeneratorError('The template has symbol placeholders, but no symbol images are available.');
    if (key) return renderKey(key);
    const { size, style } = styledDate as StyledDatePlaceholder;
    return renderSymbols(date, size, renderKey, style === systemStyle);
  });
}
