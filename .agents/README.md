# AI agent setup and installed skills

[AGENTS.md](../AGENTS.md) contains the repository requirements.
These files are instructions, not permission controls or a sandbox.
Behavior depends on the host, the version, the trust settings, and higher-priority instructions.

## Files and discovery

Use uppercase `AGENTS.md` and `SKILL.md`. Do not add lowercase or duplicate rule files.
The adapters do not run commands, install packages, change permissions, or change global vendor settings.

| Host           | Repository integration                                                                                                                    | Explicit activation                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Codex          | Reads the root `AGENTS.md`. Finds skills in `.agents/skills/`.                                                                            | `$<skill>`                                 |
| Claude Code    | [CLAUDE.md](../CLAUDE.md) imports `AGENTS.md`. Skills are relative links in `.claude/skills/`. Subagents are in `.claude/agents/`.         | `/<skill>`                                 |
| Cursor         | Reads the root `AGENTS.md`.                                                                                                               | Attach `AGENTS.md` if it is not loaded.    |
| GitHub Copilot | [Repository instructions](../.github/copilot-instructions.md) refer to `AGENTS.md`.                                                       | Check the active chat or agent feature.    |
| Gemini CLI     | [GEMINI.md](../GEMINI.md) imports `AGENTS.md`. Finds skills in `.agents/skills/`.                                                          | `/memory show` shows the loaded files.     |

## Security reviewer

The Claude [security-reviewer](../.claude/agents/security-reviewer.md) subagent does the separate security review that `AGENTS.md` requires.
It has no edit tools. Its instructions forbid repository writes, Git history changes, publication, and network use.
Bash can still run commands that the session permits.
Ask for it after an implementation stage, for example: "use the security-reviewer subagent for this diff".
It reports findings. A human decides how to handle each finding.

## Installed skills

The skills come from the upstream revisions in [skills-lock.json](../skills-lock.json), with local adaptations for this generator.
This repository keeps copies of the files. Do not run the installer again without a human decision.

| Skill                     | Source             | Purpose                                                            |
| ------------------------- | ------------------ | ------------------------------------------------------------------ |
| agents-md                 | getsentry/skills   | Keep the agent instruction files short and correct.                |
| code-simplifier           | getsentry/skills   | Make generator code easier to read and keep its behavior.          |
| differential-review       | trailofbits/skills | Review a change for security regressions.                          |
| doc-coauthoring           | anthropics/skills  | Write larger documents together with the user.                     |
| find-bugs                 | getsentry/skills   | Find bugs and vulnerabilities in branch changes without edits.     |
| fp-check                  | trailofbits/skills | Check if a suspected vulnerability is real.                        |
| gha-security-review       | getsentry/skills   | Find exploitable GitHub Actions workflow vulnerabilities.          |
| grilling                  | mattpocock/skills  | Ask plan questions in rounds, each with a recommended answer.      |
| property-based-testing    | trailofbits/skills | Test invariants with generated input, for example for validators.  |
| second-opinion            | trailofbits/skills | Get a review from another agent CLI, only on an explicit request.  |
| sharp-edges               | trailofbits/skills | Find unsafe interfaces and configuration defaults.                 |
| skill-scanner             | getsentry/skills   | Examine skill instructions and scripts before you add a skill.     |
| supply-chain-risk-auditor | trailofbits/skills | Examine dependency metadata and advisories, only on request.       |
| writing-for-agents        | mattpocock/skills  | Apply writing principles to agent instructions and skills.         |

A skill gives no permission for its scripts, network requests, delegation, or changes to user data.
No skill lists Bash, Write, Edit, or network tools in `allowed-tools`.

### Local adaptations

Most skills have a "Project integration" section before the upstream text. It refers to `AGENTS.md` and keeps the safety limits:

- code-simplifier replaces the upstream text with the generator invariants, a limited refactoring scope, and verification steps.
- skill-scanner, differential-review, supply-chain-risk-auditor, fp-check, gha-security-review, and second-opinion remove Bash, Write, or Edit from `allowed-tools`.
- find-bugs adds a checklist for the template, card data, symbol images, files, subprocesses, and external effects.
- gha-security-review reports deviations from the stricter project Actions rules in a separate section.
- second-opinion permits an external provider call only on an explicit user request in the current task.
- supply-chain-risk-auditor permits its collector only on an explicit user request for a dependency audit.

property-based-testing, sharp-edges, and doc-coauthoring have no local changes.
Each skill has LICENSE and UPSTREAM.md files with the upstream attribution.

### Limits

- The supply-chain-risk-auditor collector uses the network and can read a GitHub token through `gh auth token`. Do not run it without an authorized dependency audit.
- second-opinion sends a patch and the project instructions to an external provider. Installation does not authorize this transfer.

### Updates

**CAUTION: A new installation can replace the local adaptations and the license files.**

1. Save the current skill files.
2. Examine the new upstream revision.
3. Update only the selected skills and `skills-lock.json`.
4. Apply the "Project integration" sections again and restore the license files.
5. Examine the skill again with skill-scanner and check the links in `.claude/skills/`.

On Windows, Git must keep symbolic links for the `.claude/skills/` entries.
