# MCP Server

The Argos MCP server exposes the public REST API to AI agents over the
[Model Context Protocol](https://modelcontextprotocol.io). It is served on its
own subdomain (`config.mcp.baseUrl`, `https://mcp.argos-ci.com` in production)
and authenticates with **personal access tokens** and **OAuth 2.1 access
tokens** (see `src/oauth/README.md`). Project tokens are rejected.

## Architecture: derived from OpenAPI

There is **no per-endpoint MCP code**. The whole surface is derived from the
OpenAPI document and dispatched through the existing API stack:

1. **Derivation** (`tools.ts`) — at module load, every operation in
   `api/schema.ts` whose `security` accepts a personal access token or OAuth
   (`isMcpEligible` in `eligibility.ts`) becomes a tool: name = `operationId`,
   input schema = merged path + query + body Zod schemas, output schema = the
   2xx response schema. Project-token-only CI operations, `x-internal` and
   public operations are excluded. The generated OpenAPI document stamps
   eligible operations with `x-gitbook-mcp` using the same predicate, so docs
   and tools can never disagree.
2. **Registration** (`server.ts`) — tools are registered on an SDK `McpServer`
   with their Zod schemas; the SDK converts them to JSON Schema for
   `tools/list` and validates arguments and structured results.
3. **Dispatch** (`dispatch.ts`) — a tool call becomes an HTTP request to a
   private loopback server running the `openAPIRouter`, forwarding the
   caller's bearer. Validation, authentication, **scope enforcement**,
   serialization and error formatting are the API's own; API errors surface
   verbatim as `isError` tool results.
4. **Transport** (`router.ts`) — stateless Streamable HTTP at `POST /` (a
   fresh server + transport per request). Browsers hitting `GET /` are
   redirected to the documentation.

Adding a REST endpoint automatically adds the MCP tool. The unit test
snapshot in `tools.test.ts` locks the tool surface; adding an endpoint updates
that snapshot, which is the only MCP touchpoint in review.

### `x-mcp` operation extension

Operations can opt out or customize their projection:

```ts
"x-mcp": { enabled?: boolean; name?: string; description?: string }
```

No operation needs it by default — eligibility is computed from `security`.

## Authentication and audience

- Requests without a valid PAT/OAuth bearer get `401` +
  `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`,
  which triggers the MCP client authorization flow (discovery → Dynamic Client
  Registration → consent).
- The MCP server is its own OAuth resource (RFC 8707 audience,
  `getMcpResourceUrl()`). It accepts tokens bound to the MCP resource or to
  the REST API resource; the public REST API keeps accepting only its own
  audience (`markAcceptedOAuthResources` in `auth/oauth-access-token.ts`).
- OAuth scopes are enforced per tool call by the API layer
  (`assertOAuthScopes`); scope failures come back as `isError` tool results,
  not HTTP 401s, so clients don't needlessly re-authenticate.

## Agent attribution

A tool call carries the user's own credentials, so what it writes is otherwise
indistinguishable from what that person typed. `src/agent/request.ts` resolves
the acting agent from the OAuth client behind the token — its `knownAppId` when
the curated registry recognizes it, `unknown` otherwise, since a client that
isn't the first-party CLI is an agent by construction here. Comments store the
result and the UI marks them (see `src/agent/registry.ts`). The CLI carries the
same information in a `User-Agent` `agent/<name>` token instead.

## Discovery

`GET /.well-known/mcp/server-card.json` on the MCP origin serves the canonical
[SEP-1649 Server Card](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2127)
(`server-card.ts`): endpoint, transport and OAuth entry point for
pre-connection discovery. Its `serverInfo` is the same `MCP_SERVER_INFO`
object the server hands to the SDK, and the e2e test checks the card against a
live `initialize` response, so the card cannot drift from the running server.
The marketing site serves a copy at
`argos-ci.com/.well-known/mcp/server-card.json`.

## Local development

The `mcp` subdomain must resolve to the backend (like `api` and `app`):
add `mcp.argos-ci.dev` to `/etc/hosts` alongside the other Argos hosts.
Requests need `Accept: application/json, text/event-stream` (MCP spec,
enforced by the SDK transport).

```sh
claude mcp add --transport http argos https://mcp.argos-ci.dev:4001
```
