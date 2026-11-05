// Git hook check from AGENTS.md: no AI agent session links or session trailers in commit messages.
// Usage: node scripts/git-rules.mjs message <commit-message-file>
import { pathToFileURL } from 'node:url';

import { readRegularFile } from './lib/files.mjs';
import { aiLinkProblems } from './lib/rules.mjs';

const messageLimit = 1024 * 1024;

// Remove the lines that Git removes with the default cleanup mode before the message check.
export function commitMessageProblems(text) {
  const message = text
    .split(/\r?\n/)
    .filter((line) => !line.startsWith('#'))
    .join('\n');
  return aiLinkProblems(message, 'Commit message');
}

function main() {
  const [mode, path, ...rest] = process.argv.slice(2);
  if (mode !== 'message' || !path || rest.length) throw new Error('Usage: git-rules.mjs message <file>');
  const text = readRegularFile(path, messageLimit);
  if (text === undefined) throw new Error('The commit message file is not found.');
  const problems = commitMessageProblems(text);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (error) {
    console.error(String(error.message).replace(/[\p{Cc}\p{Cf}]/gu, '?'));
    process.exitCode = 2;
  }
}
