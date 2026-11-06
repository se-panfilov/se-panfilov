import { mkdirSync, readdirSync, readFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

import { readTextFile, writeTextFileAtomic } from '@tarot/files';
import { describe, expect, it } from 'vitest';

import { makeRepository } from './helpers';

describe('readTextFile', () => {
  it('returns undefined for a missing file', () => {
    expect(readTextFile(join(makeRepository({}), 'missing.md'), 100)).toBeUndefined();
  });

  it('rejects a link and a directory', () => {
    const root = makeRepository({ 'a.md': 'text' });
    symlinkSync(join(root, 'a.md'), join(root, 'link.md'));
    mkdirSync(join(root, 'dir'));
    expect(() => readTextFile(join(root, 'link.md'), 100)).toThrow(/link/);
    expect(() => readTextFile(join(root, 'dir'), 100)).toThrow(/regular file/);
  });
});

describe('writeTextFileAtomic', () => {
  it('creates and replaces a file without temporary files left', () => {
    const root = makeRepository({});
    const path = join(root, 'README.md');
    writeTextFileAtomic(path, 'one');
    writeTextFileAtomic(path, 'two');
    expect(readFileSync(path, 'utf8')).toBe('two');
    expect(readdirSync(root)).toEqual(['README.md']);
  });

  it('does not write through a link', () => {
    const root = makeRepository({ 'target.md': 'keep' });
    symlinkSync(join(root, 'target.md'), join(root, 'README.md'));
    expect(() => writeTextFileAtomic(join(root, 'README.md'), 'new')).toThrow(/regular file/);
    expect(readFileSync(join(root, 'target.md'), 'utf8')).toBe('keep');
  });
});
