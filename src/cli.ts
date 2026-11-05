#!/usr/bin/env node
import { relative } from 'node:path';
import { parseArgs } from 'node:util';

import { GeneratorError } from '@tarot/errors';
import { writeTextFileAtomic } from '@tarot/files';
import { generateReadme } from '@tarot/generate';

const usage = `Usage: npm run readme [-- --dry-run]

Select one random tarot card from assets/ and write README.md from templates/README.template.md.

Options:
  --dry-run  Print the README text. Do not write files.
  --help     Show this help.`;

// Replace control characters, so that file names and messages cannot change the terminal state.
const safe = (value: string): string => value.replace(/[\p{Cc}\p{Cf}]/gu, (character) => (character === '\n' ? character : '?'));

function main(argv: readonly string[]): number {
  let values: { 'dry-run'?: boolean; help?: boolean };
  try {
    ({ values } = parseArgs({ args: [...argv], options: { 'dry-run': { type: 'boolean' }, help: { type: 'boolean' } }, strict: true, allowPositionals: false }));
  } catch (error) {
    console.error(safe(`${(error as Error).message}\n\n${usage}`));
    return 2;
  }
  if (values.help) {
    console.log(usage);
    return 0;
  }

  const root = process.cwd();
  const result = generateReadme({ root });
  for (const text of result.textsWithoutImage) console.error(safe(`Warning: the card text has no image and is not used: ${text}`));
  for (const image of result.imagesWithoutText) console.error(safe(`Warning: the image has no card text and is not used: ${image}`));
  if (values['dry-run']) {
    process.stdout.write(result.content);
    return 0;
  }
  writeTextFileAtomic(result.outputPath, result.content);
  console.log(safe(`Wrote ${relative(root, result.outputPath)} with the card "${result.card.name}".`));
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(safe(error instanceof GeneratorError ? error.message : `Unexpected error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`));
  process.exitCode = 1;
}
