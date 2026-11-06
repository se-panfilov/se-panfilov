// Shared Git rules from AGENTS.md. The commit-msg hook uses them.
// Links to AI agent threads, chats, sessions, and tasks, by host name and path prefix.
// Product pages without a conversation are not matched.
export const aiLinkHosts = {
  'claude.ai': /^\/(code\/(session_|project\/)|chat\/|share\/|project\/)/i,
  'chatgpt.com': /^\/(c\/|share\/|codex\/tasks\/|g\/[^/]+\/c\/)/i,
  'chat.openai.com': /^\/(c\/|share\/)/i,
  'gemini.google.com': /^\/(app|share)\//i,
  'g.co': /^\/gemini\/share\//i,
  'jules.google.com': /^\/(session|task)\//i,
  'copilot.microsoft.com': /^\/(chats|shares)\//i,
  'github.com': /^\/copilot\/(c|share)\//i,
  'cursor.com': /^\/agents(\/|$)/i,
  'chat.mistral.ai': /^\/chat\//i,
  'perplexity.ai': /^\/search\//i
};
// A link with or without a scheme: a host name with at least one dot and a path.
const linkCandidate = /(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"'`)\]]*/gi;

export function hasAiLink(text) {
  for (const [candidate] of text.matchAll(linkCandidate)) {
    let url;
    try {
      url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    } catch {
      continue;
    }
    const host = url.hostname.replace(/^www\./, '');
    const path = aiLinkHosts[host];
    if (path?.test(url.pathname)) return true;
  }
  return false;
}
// Commit trailers that identify an agent session, for example `Claude-Session:`.
export const sessionTrailer = /^[A-Za-z0-9-]*Session:\s*\S/im;

// Return the problems for a commit message or pull request text. The text itself is never repeated.
export function aiLinkProblems(text, label) {
  const problems = [];
  if (hasAiLink(text)) problems.push(`${label}: contains a link to an AI agent discussion. Describe the reason in the text.`);
  if (sessionTrailer.test(text)) problems.push(`${label}: contains an agent session trailer (for example, Claude-Session:). Remove it.`);
  return problems;
}
