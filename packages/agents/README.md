# @argos/agents

Who the coding agents are, in one place: their ids, names, homepages, brand
marks, and the signals each surface recognizes them by.

Before this package the same handful of products were described three times —
once for OAuth verification, once for attributing a comment, once for the
"open in…" prompt menu — each with its own ids, labels and SVGs. They drifted.
One entry per product is what keeps the consent screen, the comment badge and
the prompt menu saying the same thing.

## Two entry points, on purpose

| Import                | Contains                                   | Used by           |
| --------------------- | ------------------------------------------ | ----------------- |
| `@argos/agents`       | the registry and its resolvers — no React  | backend, frontend |
| `@argos/agents/react` | the brand marks, `AgentLogo` / `AgentIcon` | frontend only     |

The backend resolves an agent on **every comment it stores**, so the data must
not drag React or a few kilobytes of SVG in with it. The split is what keeps
that honest: `dist/index.js` and `dist/react.js` share nothing, so importing the
registry can never pull a logo, and importing a logo can never pull the
registry — which is also why `AgentLogo` takes the `name` to build its monogram
from rather than looking it up.

Tailwind's automatic content detection stops at `node_modules`, and workspace
packages resolve through it, so the frontend's `index.css` points an `@source` at
this package's `src` — otherwise the classes on the marks generate no CSS.

## Ids are persisted

An id is written to `comments.agent` and to `oauth_clients.knownAppId`. **Add
ids freely, never rename one**: rows already carry the old value, and nothing
migrates them. Names, homepages and marks are display — change those as needed.

## The three doors

An agent never talks to the API directly. It arrives through one of:

- **OAuth / MCP** — a client registers itself (RFC 7591) and `resolveOAuthAgent`
  matches it on the _stable_ signals it supplies: a first-party `client_id`, a
  `software_id`, a `client_uri` or `redirect_uri` host. A self-asserted
  `client_name` never counts. A match earns the verified badge, the official name
  and the official logo, so adding an entry is a trust decision.
- **CLI** — the agent driving `argos` reports its own name, which the CLI sends
  in the `User-Agent`. `resolveReportedAgentId` maps it to an id.
- **Prompt deep links** — the other direction: `getPromptUrl` opens the agent on
  the user's machine with a prompt typed in but not sent.

### The `User-Agent` contract

The CLI lives in [`argos-ci/argos-javascript`](https://github.com/argos-ci/argos-javascript),
so this is the one part of the registry that spans two repositories. The CLI
detects the agent with [`@vercel/detect-agent`](https://github.com/vercel/vercel/tree/main/packages/detect-agent),
reduces the name to an HTTP token, and sends:

```
User-Agent: argos-cli/6.8.0 node/22.11.0 agent/claude-code_2-1-227_agent
```

The name is whatever the agent put in `AI_AGENT`, version tag and all, so
`resolveReportedAgentId` strips the version and matches against `reportedNames`
before ids. Anything it cannot place resolves to `UNKNOWN_AGENT_ID` rather than
to the name itself: an unvetted name must never render next to a real person's
avatar.
