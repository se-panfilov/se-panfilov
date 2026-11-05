import { symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isValidCardName, loadDeck } from '@tarot/deck';
import { GeneratorError } from '@tarot/errors';
import { describe, expect, it } from 'vitest';

import { makeRepository } from './helpers';

describe('loadDeck', () => {
  it('pairs texts and images with the same name', () => {
    const root = makeRepository({
      'assets/The Fool.md': '\uFEFF  The Fool text.\r\nSecond line.\r\n',
      'assets/The Fool.png': 'png',
      'assets/Death.txt': 'Death text.',
      'assets/Death.JPG': 'jpg'
    });
    const deck = loadDeck(root, 'assets');
    expect(deck.cards).toEqual([
      { name: 'Death', text: 'Death text.', imagePath: 'assets/Death.JPG' },
      { name: 'The Fool', text: 'The Fool text.\nSecond line.', imagePath: 'assets/The Fool.png' }
    ]);
    expect(deck.textsWithoutImage).toEqual([]);
    expect(deck.imagesWithoutText).toEqual([]);
  });

  it('pairs files in different subdirectories and ignores letter case', () => {
    const root = makeRepository({ 'assets/texts/the fool.md': 'Text.', 'assets/images/The Fool.webp': 'webp' });
    expect(loadDeck(root, 'assets').cards).toEqual([{ name: 'the fool', text: 'Text.', imagePath: 'assets/images/The Fool.webp' }]);
  });

  it('reports texts without an image and images without a text', () => {
    const root = makeRepository({
      'assets/The Fool.md': 'Text.',
      'assets/The Fool.png': 'png',
      'assets/Queen of Cups.md': 'Text.',
      'assets/Card back.png': 'png'
    });
    const deck = loadDeck(root, 'assets');
    expect(deck.cards.map((card) => card.name)).toEqual(['The Fool']);
    expect(deck.textsWithoutImage).toEqual(['assets/Queen of Cups.md']);
    expect(deck.imagesWithoutText).toEqual(['assets/Card back.png']);
  });

  it('ignores hidden files and other file types', () => {
    const root = makeRepository({ 'assets/The Fool.md': 'Text.', 'assets/The Fool.png': 'png', 'assets/.Hidden.md': 'Text.', 'assets/notes.json': '{}' });
    expect(loadDeck(root, 'assets').cards).toHaveLength(1);
  });

  it('rejects two texts with the same card name', () => {
    const root = makeRepository({ 'assets/a/The Fool.md': 'Text.', 'assets/b/The Fool.txt': 'Text.', 'assets/The Fool.png': 'png' });
    expect(() => loadDeck(root, 'assets')).toThrow(/same card name/);
  });

  it('rejects an empty card text', () => {
    const root = makeRepository({ 'assets/The Fool.md': ' \n ', 'assets/The Fool.png': 'png' });
    expect(() => loadDeck(root, 'assets')).toThrow(/empty/);
  });

  it('rejects a card text that is too large', () => {
    const root = makeRepository({ 'assets/The Fool.md': 'x'.repeat(16 * 1024 + 1), 'assets/The Fool.png': 'png' });
    expect(() => loadDeck(root, 'assets')).toThrow(GeneratorError);
  });

  it('rejects a card text that is not valid UTF-8', () => {
    const root = makeRepository({ 'assets/The Fool.png': 'png' });
    makeRepositoryFile(root, 'assets/The Fool.md', Buffer.from([0xff, 0xfe, 0xfd]));
    expect(() => loadDeck(root, 'assets')).toThrow(/UTF-8/);
  });

  it('rejects a card name with unsafe characters', () => {
    const root = makeRepository({ 'assets/The <Fool>.md': 'Text.', 'assets/The <Fool>.png': 'png' });
    expect(() => loadDeck(root, 'assets')).toThrow(/not valid/);
  });

  it('skips linked files', () => {
    const root = makeRepository({ 'assets/The Fool.md': 'Text.', 'assets/The Fool.png': 'png', 'outside.md': 'Secret.' });
    symlinkSync(join(root, 'outside.md'), join(root, 'assets', 'Death.md'));
    symlinkSync(join(root, 'assets', 'The Fool.png'), join(root, 'assets', 'Death.png'));
    expect(loadDeck(root, 'assets').cards.map((card) => card.name)).toEqual(['The Fool']);
  });

  it('fails when the assets directory is missing or has no complete cards', () => {
    expect(() => loadDeck(makeRepository({ 'other.md': '' }), 'assets')).toThrow(/not found/);
    expect(() => loadDeck(makeRepository({ 'assets/The Fool.md': 'Text.' }), 'assets')).toThrow(/no complete cards/);
  });
});

describe('isValidCardName', () => {
  it.each(['The Fool', 'King of Cups', 'Wheel of Fortune', "Ace's (2)", 'Judgement'])('accepts %s', (name) => {
    expect(isValidCardName(name)).toBe(true);
  });

  it.each(['', ' The Fool', 'The Fool ', '<b>', 'a"b', 'a-->b', '[link](x)', 'x'.repeat(101)])('rejects %j', (name) => {
    expect(isValidCardName(name)).toBe(false);
  });
});

function makeRepositoryFile(root: string, path: string, content: Buffer): void {
  writeFileSync(join(root, path), content);
}
