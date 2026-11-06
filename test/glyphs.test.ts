import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateReadme } from '@tarot/generate';
import { createKeyRenderer, type Glyphs, loadGlyphs, symbolFileName } from '@tarot/glyphs';
import { keyPlaceholders, parseKey, templateProblems } from '@tarot/template';
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
    expect(render({ symbol: 'b', size: 24 })).toBe('<img src="images/b.svg?v=abc123" width="24" alt="b">');
    expect(render({ symbol: '!', size: 30 })).toMatch(/^<img src="images\/excl_[12]\.svg\?v=abc123" width="30" alt="!">$/);
    expect(render({ symbol: 'A', size: 5 })).toMatch(/^<img src="images\/a_[1-4]\.svg\?v=abc123" width="5" alt="A">$/);
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
    const images = content.match(/<img src="images\/[^"]+" width="\d+" alt="[^"]+">/g) ?? [];
    expect(images).toHaveLength(3);
    expect(new Set(images.slice(0, 2)).size).toBe(2);
    expect(images[2]).toBe('<img src="images/excl_1.svg?v=abc123" width="22" alt="!">');
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
