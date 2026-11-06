import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateReadme } from '@tarot/generate';
import { createKeyRenderer, type Glyphs, loadGlyphs, symbolFileName } from '@tarot/glyphs';
import { keyPlaceholders, parseKey, parseStyledDate, renderSymbols, templateProblems } from '@tarot/template';
import { describe, expect, it } from 'vitest';

import { fixedIndex, makeDefaultRepository, makeRepository } from './helpers';

const glyphs: Glyphs = new Map([
  ['a', ['images/a_1.svg', 'images/a_2.svg', 'images/a_3.svg', 'images/a_4.svg']],
  ['b', ['images/b.svg']],
  ['excl', ['images/excl_1.svg', 'images/excl_2.svg']]
]);

/** A random source that returns the given values in order. */
const sequence = (values: number[]) => (max: number) => Math.min(values.shift() ?? 0, max - 1);

describe('symbol placeholders', () => {
  it('parses a symbol placeholder', () => {
    expect(parseKey('key:a:24')).toEqual({ symbol: 'a', size: 24 });
    expect(parseKey('key:5:10')).toEqual({ symbol: '5', size: 10 });
    expect(parseKey('key:,:8')).toEqual({ symbol: ',', size: 8 });
    for (const name of ['key:a', 'key:ab:2', 'key:a:0', 'key:a:1001', 'key:a:x', 'key:&:2', 'key::2', 'key:a:24:1']) expect(parseKey(name)).toBeUndefined();
  });

  it('accepts both forms and rejects a symbol placeholder that is not valid', () => {
    const base = '<!-- tarot:image --><!-- tarot:text -->';
    expect(templateProblems(`${base}<!-- tarot:key:a:24 -->{{tarot:key:?:22}}<!--tarot:key:@:1-->`)).toEqual([]);
    expect(templateProblems(`${base}<!-- tarot:key:ab:24 -->`)).toEqual([expect.stringContaining('is not valid')]);
    expect(templateProblems(`${base}{{tarot:key:a:0}}`)).toEqual([expect.stringContaining('is not valid')]);
    expect(keyPlaceholders(`${base}<!-- tarot:key:a:24 -->{{tarot:key:.:9}}`)).toEqual([
      { symbol: 'a', size: 24 },
      { symbol: '.', size: 9 }
    ]);
  });

  it('maps symbols to file names', () => {
    expect(['a', 'A', '7', '!', '?', '#', '@', '.', ','].map(symbolFileName)).toEqual(['a', 'a', '7', 'excl', 'question', 'hash', 'at', 'dot', 'comma']);
    expect(symbolFileName('&')).toBeUndefined();
    expect(symbolFileName('constructor')).toBeUndefined();
  });
});

describe('createKeyRenderer', () => {
  it('makes an image with the size, the cache key, and the symbol as alt text', () => {
    const render = createKeyRenderer(glyphs, 'abc123', fixedIndex(0));
    expect(render({ symbol: 'b', size: 24 })).toBe('<picture><img src="images/b.svg?v=abc123" width="24" alt="b"></picture>');
    expect(render({ symbol: '!', size: 30 })).toMatch(/^<picture><img src="images\/excl_[12]\.svg\?v=abc123" width="30" alt="!"><\/picture>$/);
    expect(render({ symbol: 'A', size: 5 })).toMatch(/^<picture><img src="images\/a_[1-4]\.svg\?v=abc123" width="5" alt="A"><\/picture>$/);
  });

  it('uses each variant once before it uses a variant again', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const render = createKeyRenderer(glyphs, 'k', (max) => (seed * 7 + max) % max);
      const first = Array.from({ length: 4 }, () => render({ symbol: 'a', size: 1 }));
      expect(new Set(first).size).toBe(4);
      const fifth = render({ symbol: 'a', size: 1 });
      expect(fifth).not.toBe(first[3]);
    }
  });

  it('selects the variants at random', () => {
    const one = createKeyRenderer(glyphs, 'k', sequence([0, 0, 0]))({ symbol: 'a', size: 1 });
    const two = createKeyRenderer(glyphs, 'k', sequence([3, 2, 1]))({ symbol: 'a', size: 1 });
    expect(one).not.toBe(two);
  });

  it('rejects a cache key that is not alphanumeric', () => {
    for (const key of ['', 'a"b', 'a b', 'x'.repeat(65)]) expect(() => createKeyRenderer(glyphs, key)).toThrow(/cache key/);
  });

  it('rejects a symbol without an image', () => {
    const render = createKeyRenderer(glyphs, 'k', fixedIndex(0));
    expect(() => render({ symbol: 'z', size: 1 })).toThrow(/No image for the symbol "z"/);
    expect(() => render({ symbol: '#', size: 1 })).toThrow(/hash_1\.svg/);
  });
});

describe('loadGlyphs', () => {
  it('finds numbered variants and single images, and skips other files', () => {
    const root = makeRepository({ 'images/a_2.svg': '', 'images/a_1.svg': '', 'images/a_10.svg': '', 'images/b.svg': '', 'images/c_1.png': '', 'images/C_1.svg': '', 'images/sub/d_1.svg': '' });
    writeFileSync(join(root, 'target.svg'), '');
    symlinkSync(join(root, 'target.svg'), join(root, 'images/e_1.svg'));
    expect(loadGlyphs(root, 'images')).toEqual(
      new Map([
        ['b', ['images/b.svg']],
        ['a', ['images/a_1.svg', 'images/a_2.svg', 'images/a_10.svg']]
      ])
    );
  });

  it('uses only the numbered variants when both forms exist', () => {
    const root = makeRepository({ 'images/a.svg': '', 'images/a_1.svg': '' });
    expect(loadGlyphs(root, 'images').get('a')).toEqual(['images/a_1.svg']);
  });

  it('rejects a missing directory', () => {
    const root = makeRepository({});
    mkdirSync(join(root, 'other'));
    expect(() => loadGlyphs(root, 'images')).toThrow(/not found/);
  });
});

describe('generateReadme with symbol placeholders', () => {
  it('puts symbol images with the cache key into the README', () => {
    const root = makeDefaultRepository({
      'templates/README.template.md': '<!-- tarot:image -->\n<!-- tarot:text -->\n<!-- tarot:key:a:24 -->{{tarot:key:a:24}}<!-- tarot:key:!:22 -->\n',
      'images/a_1.svg': '',
      'images/a_2.svg': '',
      'images/excl_1.svg': ''
    });
    const { content } = generateReadme({ root, random: fixedIndex(0), cacheKey: 'abc123' });
    const images = content.match(/<picture><img src="images\/[^"]+" width="\d+" alt="[^"]+"><\/picture>/g) ?? [];
    expect(images).toHaveLength(3);
    expect(new Set(images.slice(0, 2)).size).toBe(2);
    expect(images[2]).toBe('<picture><img src="images/excl_1.svg?v=abc123" width="22" alt="!"></picture>');
    expect(content).not.toContain('tarot:key');
  });

  it('does not need the image directory when the template has no symbol placeholders', () => {
    expect(() => generateReadme({ root: makeDefaultRepository(), random: fixedIndex(0) })).not.toThrow();
  });

  it('rejects a symbol without an image', () => {
    const root = makeDefaultRepository({ 'templates/README.template.md': '<!-- tarot:image -->\n<!-- tarot:text -->\n<!-- tarot:key:q:24 -->\n', 'images/a_1.svg': '' });
    expect(() => generateReadme({ root, random: fixedIndex(0) })).toThrow(/No image for the symbol "q"/);
  });
});

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'.match(/./g) ?? [];

describe('date placeholder with symbol images', () => {
  it('parses and checks the placeholder', () => {
    expect(parseStyledDate('date:capri:24')).toEqual({ style: 'capri', size: 24 });
    for (const name of ['date:capri', 'date:Capri:24', 'date::24', 'date:capri:0', 'date:../x:24', 'date:capri:24:1']) expect(parseStyledDate(name)).toBeUndefined();
    const base = '<!-- tarot:image --><!-- tarot:text -->';
    expect(templateProblems(`${base}<!-- tarot:date:capri:24 -->{{tarot:date:capri:10}}`)).toEqual([]);
    expect(templateProblems(`${base}<!-- tarot:date:Capri:24 -->`)).toEqual([expect.stringContaining('is not valid')]);
  });

  it('makes an image for each letter and digit and keeps the spaces', () => {
    const glyphSet: Glyphs = new Map(alphabet.map((name) => [name, [`images/${name}.svg`]]));
    expect(renderSymbols('5 Nov', 24, createKeyRenderer(glyphSet, 'k', fixedIndex(0)))).toBe(
      '<picture><img src="images/5.svg?v=k" width="24" alt="5"></picture> <picture><img src="images/n.svg?v=k" width="24" alt="N"></picture><picture><img src="images/o.svg?v=k" width="24" alt="o"></picture><picture><img src="images/v.svg?v=k" width="24" alt="v"></picture>'
    );
  });

  it('puts the date as symbol images from images/ into the README', () => {
    const files: Record<string, string> = { 'templates/README.template.md': '<!-- tarot:image -->\n<!-- tarot:text -->\n<!-- tarot:date:capri:24 -->\n' };
    for (const name of alphabet) files[`images/${name}.svg`] = '';
    const { content } = generateReadme({ root: makeDefaultRepository(files), random: fixedIndex(0), cacheKey: 'k', now: new Date('2026-11-06T12:00:00Z') });
    const expected = (('6 November 2026'.match(/./g) ?? []) as string[])
      .map((c) => (c === ' ' ? ' ' : `<picture><img src="images/${c.toLowerCase()}.svg?v=k" width="24" alt="${c}"></picture>`))
      .join('');
    expect(content).toContain(`\n${expected}\n`);
  });

  it('uses different variants of the same letter in the date', () => {
    const files: Record<string, string> = { 'templates/README.template.md': '<!-- tarot:image -->\n<!-- tarot:text -->\n{{tarot:date:capri:24}}\n' };
    for (const name of alphabet) for (const variant of [1, 2]) files[`images/${name}_${variant}.svg`] = '';
    const { content } = generateReadme({ root: makeDefaultRepository(files), random: fixedIndex(0), cacheKey: 'k', now: new Date('2026-11-06T12:00:00Z') });
    const eImages = content.match(/images\/e_\d\.svg/g) ?? [];
    expect(eImages).toHaveLength(2);
    expect(new Set(eImages).size).toBe(2);
  });

  it('uses variant 5 for the system style and never for random variants', () => {
    const files: Record<string, string> = { 'templates/README.template.md': '<!-- tarot:image -->\n<!-- tarot:text -->\n<!-- tarot:date:system:20 -->\n{{tarot:date:capri:24}}\n' };
    for (const name of alphabet) for (const variant of [1, 2, 3, 4, 5]) files[`images/${name}_${variant}.svg`] = '';
    for (let seed = 0; seed < 5; seed += 1) {
      const { content } = generateReadme({ root: makeDefaultRepository(files), random: (max) => (seed + max) % max, cacheKey: 'k', now: new Date('2026-11-06T12:00:00Z') });
      const [system = '', capri = ''] = content.split('\n').filter((line) => line.includes('images/'));
      expect(system).toContain('<picture><img src="images/6_5.svg?v=k" width="20" alt="6"></picture> <picture><img src="images/n_5.svg?v=k" width="20" alt="N"></picture>');
      expect(system.match(/images\/[a-z0-9]+_[1-4]\.svg/)).toBeNull();
      expect(capri.match(/images\/[a-z0-9]+_5\.svg/)).toBeNull();
    }
  });

  it('rejects the system style when a variant 5 image is missing', () => {
    const files: Record<string, string> = { 'templates/README.template.md': '<!-- tarot:image -->\n<!-- tarot:text -->\n<!-- tarot:date:system:20 -->\n' };
    for (const name of alphabet) files[`images/${name}_1.svg`] = '';
    expect(() => generateReadme({ root: makeDefaultRepository(files), random: fixedIndex(0) })).toThrow(/_5\.svg/);
  });

  it('loads only one variant when asked', () => {
    const root = makeRepository({ 'images/a_1.svg': '', 'images/a_5.svg': '', 'images/b.svg': '' });
    expect(loadGlyphs(root, 'images', 5)).toEqual(new Map([['a', ['images/a_5.svg']]]));
    expect(loadGlyphs(root, 'images').get('a')).toEqual(['images/a_1.svg']);
  });
});
