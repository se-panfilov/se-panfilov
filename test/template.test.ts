import { type Card } from '@tarot/deck';
import { encodePath, renderImage, renderTemplate, templateProblems } from '@tarot/template';
import { describe, expect, it } from 'vitest';

import { validTemplate } from './helpers';

const card: Card = { name: 'The Fool', text: 'Line one.\n\nLine two.', imagePath: 'assets/The Fool.png' };

describe('templateProblems', () => {
  it('accepts a valid template', () => {
    expect(templateProblems(validTemplate)).toEqual([]);
  });

  it('accepts spaces inside a placeholder and a template without name and date', () => {
    expect(templateProblems('<!--tarot:image-->\n<!--   tarot:text   -->')).toEqual([]);
  });

  it('requires exactly one image and one text', () => {
    expect(templateProblems('<!-- tarot:name -->')).toEqual([
      'The placeholder <!-- tarot:image --> must occur exactly 1 time(s). It occurs 0 time(s).',
      'The placeholder <!-- tarot:text --> must occur exactly 1 time(s). It occurs 0 time(s).'
    ]);
    expect(templateProblems('<!-- tarot:image --><!-- tarot:image --><!-- tarot:text --><!-- tarot:text -->')).toHaveLength(2);
  });

  it('rejects an unknown placeholder', () => {
    expect(templateProblems('<!-- tarot:image --><!-- tarot:text --><!-- tarot:card -->')).toEqual([expect.stringContaining('Unknown placeholder "<!-- tarot:card -->"')]);
  });
});

describe('renderTemplate', () => {
  it('replaces each placeholder and keeps the text around them', () => {
    expect(renderTemplate(validTemplate, card, { date: '5 November 2026', cacheKey: 'abc123' })).toBe(`# Top text

Date: 5 November 2026

<img src="assets/The%20Fool.png?v=abc123" alt="The Fool">

## The Fool

Line one.

Line two.

Bottom text
`);
  });

  it('does not process placeholders in the card text', () => {
    const injected: Card = { ...card, text: 'Text <!-- tarot:image --> <!-- tarot:name -->' };
    const result = renderTemplate('<!-- tarot:image -->\n<!-- tarot:text -->', injected, { date: 'date', cacheKey: 'k' });
    expect(result.split('<img').length).toBe(2);
    expect(result).toContain('Text <!-- tarot:image --> <!-- tarot:name -->');
  });

  it('puts the cache key into other image links', () => {
    const template = '<!-- tarot:image -->\n<img src="images/capri.png?v=<!-- tarot:cacheKey -->" alt="Capri">\n<!-- tarot:text -->\n<img src="images/b.png?v=<!--tarot:cacheKey-->">';
    const result = renderTemplate(template, card, { date: 'date', cacheKey: 'abc123' });
    expect(result).toContain('<img src="images/capri.png?v=abc123" alt="Capri">');
    expect(result).toContain('<img src="images/b.png?v=abc123">');
    expect(result).not.toContain('tarot:cacheKey');
  });

  it('accepts the {{tarot:name}} form of each placeholder', () => {
    const template = '{{tarot:image}}\n<img src="images/capri.png?v={{tarot:cacheKey}}" alt="Capri">\n{{ tarot:name }} {{tarot:date}}\n<!-- tarot:text -->';
    expect(templateProblems(template)).toEqual([]);
    const result = renderTemplate(template, card, { date: 'date', cacheKey: 'abc123' });
    expect(result).toContain('<img src="images/capri.png?v=abc123" alt="Capri">');
    expect(result).toContain('The Fool date');
    expect(result).not.toContain('tarot:');
  });

  it('counts both forms of a placeholder together', () => {
    expect(templateProblems('<!-- tarot:image -->{{tarot:image}}<!-- tarot:text -->')).toEqual([expect.stringContaining('tarot:image')]);
    expect(templateProblems('<!-- tarot:image --><!-- tarot:text -->{{tarot:card}}')).toEqual([expect.stringContaining('Unknown placeholder "{{tarot:card}}"')]);
  });

  it('does not process the {{tarot:name}} form in the card text', () => {
    const injected: Card = { ...card, text: 'Text {{tarot:image}} {{tarot:cacheKey}}' };
    expect(renderTemplate('{{tarot:image}}\n{{tarot:text}}', injected, { date: 'date', cacheKey: 'k' })).toContain('Text {{tarot:image}} {{tarot:cacheKey}}');
  });

  it('rejects a cache key that is not alphanumeric when the template uses it', () => {
    expect(() => renderTemplate('<!-- tarot:image -->\n<!-- tarot:text -->\n<!-- tarot:cacheKey -->', card, { date: 'date', cacheKey: 'a"b' })).toThrow(/cache key/);
  });

  it('rejects a template that is not valid', () => {
    expect(() => renderTemplate('<!-- tarot:text -->', card, { date: 'date', cacheKey: 'k' })).toThrow(/tarot:image/);
  });
});

describe('renderImage', () => {
  it('encodes the path and escapes HTML', () => {
    expect(renderImage({ name: "Ace's & Co", text: 't', imagePath: 'assets/a b/c#d.png' }, 'k1')).toBe('<img src="assets/a%20b/c%23d.png?v=k1" alt="Ace&#39;s &amp; Co">');
  });

  it('rejects a cache key that is not alphanumeric', () => {
    for (const key of ['', 'a&b', 'a"b', 'x'.repeat(65)]) expect(() => renderImage(card, key)).toThrow(/cache key/);
  });

  it('encodes each path segment', () => {
    expect(encodePath('assets/The Fool.png')).toBe('assets/The%20Fool.png');
  });
});
