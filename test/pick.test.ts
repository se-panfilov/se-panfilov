import { type Card } from '@tarot/deck';
import { pickCard, secureRandomIndex } from '@tarot/pick';
import { describe, expect, it } from 'vitest';

import { fixedIndex } from './helpers';

const cards: Card[] = ['Death', 'The Fool', 'The Star'].map((name) => ({ name, text: `${name} text.`, imagePath: `assets/${name}.png` }));

describe('pickCard', () => {
  it('selects the card at the random index', () => {
    expect(pickCard(cards, fixedIndex(1)).name).toBe('The Fool');
  });

  it('does not select the previous card again', () => {
    for (let index = 0; index < 2; index += 1) expect(pickCard(cards, fixedIndex(index), 'The Fool').name).not.toBe('The Fool');
  });

  it('gives the random source the number of candidates', () => {
    const sizes: number[] = [];
    pickCard(cards, (max) => (sizes.push(max), 0), 'Death');
    expect(sizes).toEqual([2]);
  });

  it('selects the only card even when it was the previous card', () => {
    expect(pickCard(cards.slice(0, 1), fixedIndex(0), 'Death').name).toBe('Death');
  });

  it('rejects an index outside the range', () => {
    expect(() => pickCard(cards, fixedIndex(3))).toThrow(/outside the range/);
    expect(() => pickCard(cards, fixedIndex(0.5))).toThrow(/outside the range/);
  });

  it('rejects an empty deck', () => {
    expect(() => pickCard([], fixedIndex(0))).toThrow(/empty/);
  });

  it('selects each card with the secure random source', () => {
    const seen = new Set<string>();
    for (let attempt = 0; attempt < 200 && seen.size < cards.length; attempt += 1) seen.add(pickCard(cards, secureRandomIndex).name);
    expect(seen.size).toBe(cards.length);
  });
});
