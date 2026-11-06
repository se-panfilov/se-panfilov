import { randomInt } from 'node:crypto';

import { type Card } from '@tarot/deck';

/** Returns an integer in the range [0, max). */
export type RandomIndex = (max: number) => number;

export const secureRandomIndex: RandomIndex = (max) => randomInt(max);

/**
 * Select one random card. When the deck has more than one card, the previous card is not selected again,
 * so that the reading changes each day.
 */
export function pickCard(cards: readonly Card[], random: RandomIndex = secureRandomIndex, previous?: string): Card {
  const candidates = cards.length > 1 && previous !== undefined ? cards.filter((card) => card.name !== previous) : cards;
  if (candidates.length === 0) throw new Error('The deck is empty.');
  const index = random(candidates.length);
  const card = Number.isInteger(index) ? candidates[index] : undefined;
  if (!card) throw new Error(`The random source returned an index outside the range [0, ${candidates.length}).`);
  return card;
}
