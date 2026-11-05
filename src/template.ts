import { imageWidth } from '@tarot/config';
import { type Card } from '@tarot/deck';
import { GeneratorError } from '@tarot/errors';

/**
 * Template placeholders. A placeholder is an HTML comment, so a template stays valid Markdown:
 * `<!-- tarot:image -->`, `<!-- tarot:text -->`, `<!-- tarot:name -->`, and `<!-- tarot:date -->`.
 */
export const placeholders = ['image', 'text', 'name', 'date'] as const;
export type Placeholder = (typeof placeholders)[number];

/** The number of times each placeholder can occur. One reading shows exactly one card image and one card text. */
const occurrences: Record<Placeholder, { readonly min: number; readonly max: number }> = {
  image: { min: 1, max: 1 },
  text: { min: 1, max: 1 },
  name: { min: 0, max: Infinity },
  date: { min: 0, max: Infinity }
};

const placeholderPattern = /<!--\s*tarot:([A-Za-z0-9_-]*)\s*-->/g;

function isPlaceholder(value: string): value is Placeholder {
  return (placeholders as readonly string[]).includes(value);
}

/** Check the placeholders in a template. Returns a list of problems. An empty list means that the template is valid. */
export function templateProblems(template: string): string[] {
  const problems: string[] = [];
  const counts = new Map<Placeholder, number>();
  for (const match of template.matchAll(placeholderPattern)) {
    const name = match[1] ?? '';
    if (!isPlaceholder(name)) {
      problems.push(`Unknown placeholder "${match[0]}". Known placeholders: ${placeholders.map((item) => `<!-- tarot:${item} -->`).join(', ')}.`);
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

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Encode each path segment, so that names with spaces work in links. */
export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

const cacheKeyPattern = /^[A-Za-z0-9]{1,64}$/;

/**
 * Make the `<img>` element. The cache key goes into the query string, so that browsers and the GitHub image proxy
 * load the image again after each run.
 */
export function renderImage(card: Card, cacheKey: string): string {
  if (!cacheKeyPattern.test(cacheKey)) throw new Error('The cache key must have 1 to 64 ASCII letters or digits.');
  return `<img src="${escapeHtml(encodePath(card.imagePath))}?v=${cacheKey}" alt="${escapeHtml(card.name)}" width="${imageWidth}">`;
}

export type RenderValues = {
  /** The date of the reading. */
  readonly date: string;
  /** A random value for the image query string. */
  readonly cacheKey: string;
};

/**
 * Put the card into the template. All placeholders are replaced in one pass.
 * Thus text from a card file cannot add placeholders or change other parts of the template.
 */
export function renderTemplate(template: string, card: Card, { date, cacheKey }: RenderValues): string {
  const problems = templateProblems(template);
  if (problems.length) throw new GeneratorError(`The template is not valid:\n- ${problems.join('\n- ')}`);
  const values: Record<Placeholder, string> = { image: renderImage(card, cacheKey), text: card.text, name: card.name, date };
  return template.replace(placeholderPattern, (_match, name: string) => (isPlaceholder(name) ? values[name] : ''));
}
