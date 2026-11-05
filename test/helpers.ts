import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { onTestFinished } from 'vitest';

export const validTemplate = `# Top text

Date: <!-- tarot:date -->

<!-- tarot:image -->

## <!-- tarot:name -->

<!-- tarot:text -->

Bottom text
`;

/** Make a temporary repository with the given files. The directory is removed after the test. */
export function makeRepository(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'tarot-readme-test-'));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

/** A repository with a valid template and two complete cards. */
export function makeDefaultRepository(extra: Record<string, string> = {}): string {
  return makeRepository({
    'templates/README.template.md': validTemplate,
    'assets/The Fool.md': 'The Fool text.\n',
    'assets/The Fool.png': 'png',
    'assets/The Star.md': 'The Star text.\n',
    'assets/The Star.png': 'png',
    ...extra
  });
}

/** A random source that always returns the given index. */
export const fixedIndex =
  (index: number) =>
  (_max: number): number =>
    index;
