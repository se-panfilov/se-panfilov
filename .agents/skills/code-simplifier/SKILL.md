---
name: code-simplifier
description: Simplify generator code for readability while preserving behavior and security. Use for requested refactoring or cleanup of recently changed code.
license: Apache-2.0
metadata:
  upstream-source: getsentry/skills
  upstream-revision: d12f250460ffd961f549dbebf7eeb0cf4afd4c2e
---

<!--
Adapted for this repository from Sentry's code-simplifier skill:
https://github.com/getsentry/skills/blob/d12f250460ffd961f549dbebf7eeb0cf4afd4c2e/skills/code-simplifier/SKILL.md
The upstream skill is based on Anthropic's code-simplifier agent:
https://github.com/anthropics/claude-plugins-official/blob/main/plugins/code-simplifier/agents/code-simplifier.md
Local changes remove React advice and blanket exception-handling preferences.
They add generator safety invariants, explicit scope, and verification requirements.
-->

# Simplify generator code

Read [AGENTS.md](../../../AGENTS.md) first.
Use the [security-reviewer](../../../.claude/agents/security-reviewer.md) subagent, or an equivalent separate review, for the required security review.
This skill grants no additional permission to change assets, Git history, or external services.

## Scope

Simplify the files selected by the user or the code changed for the current task.
Do not expand a cleanup into a repository-wide refactor.
Do not modify unrelated user changes, generated build output, `README.md`, or card assets.

## Preserve behavior

Keep public APIs, return values, exit codes, file contents, and ordering intact.
Keep prompts, help, errors, and defaults intact unless the task requests a text change.
Keep the compiled output compatible with the supported Node.js versions.
Preserve explicit runtime imports and the `dist/` build output.

Preserve these properties when present:

- Template placeholder validation, both placeholder forms (`<!-- tarot:name -->` and `{{tarot:name}}`), and rejection of ambiguous states.
- One card and one text in each generated `README.md`.
- Card data validation: names, text size, image extensions, and paths inside `assets/`.
- Symbol image rules: files in `images/`, random variants `_1` to `_4` without repeats, the fixed variant `_5` for the `system` style, and the `<picture>` wrapper.
- The cache key in each image link.
- Injected randomness, so that tests stay deterministic.
- Path checks, link checks, and atomic writes.
- Dry-run behavior and clear failure diagnostics.

Do not remove try/catch/finally blocks merely to reduce nesting.
Keep error propagation, cleanup, and recovery semantics intact.
Keep comments that explain a template rule, a security invariant, or a non-obvious tool constraint.
Write new code comments in English.

## Improve readability

Prefer explicit control flow to nested ternaries and dense expressions.
Use the project terms for names: card, deck, template, placeholder, symbol image, variant, cache key.
Remove redundant abstractions only when their removal improves understanding.
Keep loading, validation, rendering, and writes distinct.
Use early returns only when they preserve cleanup and error behavior.
Do not introduce a dependency, framework, or new build step for cosmetic simplification.
Choose clarity over fewer lines or fewer tokens.

## Verify the change

1. Identify the behavior and safety properties affected by the refactor.
2. Make the smallest useful change.
3. Read the complete diff, including failure and cleanup paths.
4. Run the relevant existing checks in isolated temporary directories with synthetic cards.
5. Compare the rendered output before and after the change with a fixed random source.
6. Add a regression check if the change exposes a defect or missing behavioral coverage.
7. Perform the separate security review required by AGENTS.md.
8. Report the result, executed checks, and remaining limits in English.
