import { describe, expect, it } from 'vitest';

import { commitMessageProblems } from '../scripts/git-rules.mjs';

describe('commit message rules', () => {
  it('accepts a normal message', () => {
    expect(commitMessageProblems('feat: add the generator\n\nCo-Authored-By: Someone <a@b.c>\n')).toEqual([]);
  });

  it('rejects agent session links and trailers', () => {
    expect(commitMessageProblems('fix: x\n\nSee https://claude.ai/code/session_abc\n')).toHaveLength(1);
    expect(commitMessageProblems('fix: x\n\nClaude-Session: abc\n')).toHaveLength(1);
  });

  it('ignores comment lines', () => {
    expect(commitMessageProblems('fix: x\n# https://claude.ai/chat/abc\n')).toEqual([]);
  });
});
