import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { makeDefaultRepository, makeRepository } from './helpers';

// The test script builds dist/ before Vitest starts.
const cli = fileURLToPath(new URL('../dist/src/cli.js', import.meta.url));

function run(cwd: string, args: string[] = []): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 30000 });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('cli', () => {
  it('writes README.md with one card', () => {
    const root = makeDefaultRepository();
    const result = run(root);
    expect(result.status).toBe(0);
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    expect(readme).toMatch(/Card: The (Fool|Star) -->/);
    expect(readme.match(/<img /g)).toHaveLength(1);
    expect(readme).toContain('# Top text');
    expect(readme).toContain('Bottom text');
    expect(result.stdout).toMatch(/Wrote README.md with the card "The (Fool|Star)"/);
  });

  it('prints the README in a dry run and does not write files', () => {
    const root = makeDefaultRepository();
    const result = run(root, ['--dry-run']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# Top text');
    expect(existsSync(join(root, 'README.md'))).toBe(false);
  });

  it('warns about incomplete cards', () => {
    const root = makeDefaultRepository({ 'assets/Queen of Cups.md': 'Text.' });
    expect(run(root, ['--dry-run']).stderr).toContain('Warning: the card text has no image and is not used: assets/Queen of Cups.md');
  });

  it('shows help', () => {
    const result = run(makeRepository({}), ['--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage: npm run readme');
  });

  it('rejects unknown options with status 2', () => {
    const result = run(makeRepository({}), ['--force']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Usage:');
  });

  it('reports an expected failure with status 1 and no stack trace', () => {
    const result = run(makeRepository({}));
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe('The template is not found: templates/README.template.md');
  });
});
