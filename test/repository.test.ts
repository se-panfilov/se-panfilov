import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defaultPaths } from '@tarot/config';
import { loadDeck } from '@tarot/deck';
import { generateReadme } from '@tarot/generate';
import { templateProblems } from '@tarot/template';
import { describe, expect, it } from 'vitest';

// Checks of the real template and the real card files in this repository.
const root = fileURLToPath(new URL('..', import.meta.url));

describe('repository data', () => {
  it('has a valid template with text above and below the card', () => {
    const template = readFileSync(new URL(`../${defaultPaths.template}`, import.meta.url), 'utf8');
    expect(templateProblems(template)).toEqual([]);
    const image = template.indexOf('<!-- tarot:image -->');
    expect(template.slice(0, image).trim()).not.toBe('');
    expect(template.slice(template.indexOf('<!-- tarot:text -->') + '<!-- tarot:text -->'.length).trim()).not.toBe('');
  });

  it('shows the fan content notice', () => {
    const notice = 'This is an unofficial fan work and is not affiliated with, approved by, or endorsed by CD PROJEKT RED.';
    for (const path of [defaultPaths.template, 'LIST.md', 'NOTICE.md']) expect(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')).toContain(notice);
  });

  it('has complete cards', () => {
    const deck = loadDeck(root, defaultPaths.assets);
    expect(deck.cards.length).toBeGreaterThan(1);
    expect(deck.imagesWithoutText).toEqual([]);
  });

  it('renders each card', () => {
    const { cards } = loadDeck(root, defaultPaths.assets);
    cards.forEach((card, index) => {
      const result = generateReadme({ root, random: (max) => Math.min(index, max - 1) });
      expect(result.content).toContain(`alt="${result.card.name}"`);
      expect(result.content).toContain(result.card.text);
      expect(card.text).not.toBe('');
    });
  });
});
