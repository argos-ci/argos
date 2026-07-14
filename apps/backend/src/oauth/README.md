# OAuth 2.1 Authorization Server

Argos is its own OAuth 2.1 **Authorization Server** (AS) and **Resource Server**
(RS). This powers the CLI login and is compatible with the
[MCP authorization spec](https://modelcontextprotocol.io/docs/tutorials/security/authorization.md)
so the future MCP server can plug in without further AS work.

Tokens are **opaque and hashed at rest** (like personal access tokens and
sessions — no JWT). Every request re-validates the token's account scope against
the user's current membership, so an OAuth scope can only ever _narrow_ what the
authenticated user is already allowed to do.

## Endpoints

The AS lives on the app origin (`config.server.url`). The RS is the REST API
(`config.api.baseUrl` + `/v2`) today; a future MCP server is another RS.

| Endpoint                                          | Purpose                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `GET  /.well-known/oauth-authorization-server`    | AS metadata (RFC 8414)                                             |
| `GET  {api}/.well-known/oauth-protected-resource` | Protected Resource Metadata (RFC 9728)                             |
| `GET  /oauth/authorize`                           | Consent screen (SPA; `apps/frontend/src/pages/OAuthAuthorize.tsx`) |
| `POST /oauth/token`                               | `authorization_code` + `refresh_token`                             |
| `POST /oauth/register`                            | Dynamic Client Registration (RFC 7591)                             |
| `POST /oauth/introspect`                          | Token introspection (RFC 7662)                                     |
| `POST /oauth/revoke`                              | Token revocation (RFC 7009)                                        |

PKCE (`S256`) is **mandatory**. Access tokens are short-lived (1h); refresh
tokens rotate and reuse of a rotated token revokes the whole grant.

## Scopes

See `scopes.ts`. Medium-grained `resource:action`: `profile`, `projects:read`,
`projects:write`, `builds:write`, `reviews:write`, `comments:read`,
`comments:write`, `account:admin`. Consent also binds the token to the specific
organizations the user selects.

## CLI login (loopback authorization-code + PKCE, RFC 8252)

Implemented in the **separate CLI repo**; the AS side is here. The CLI is the
first-party public client `argos-cli` (no secret), seeded by migration
`20260714130000_seed-argos-cli-oauth-client.js`.

1. CLI generates a `code_verifier` + `code_challenge` (S256), starts a local
   server on an ephemeral port, and opens the browser to:
   ```
   {server.url}/oauth/authorize?response_type=code&client_id=argos-cli
     &redirect_uri=http://127.0.0.1:<port>/callback
     &scope=profile%20projects:read&state=<random>&code_challenge=<challenge>
     &code_challenge_method=S256
   ```
   Loopback redirect URIs match `argos-cli` regardless of port.
2. The user logs in (if needed), picks organizations, and approves. The browser
   is redirected to `http://127.0.0.1:<port>/callback?code=<code>&state=<state>`.
3. The CLI verifies `state`, then exchanges the code:
   ```
   POST {server.url}/oauth/token
   grant_type=authorization_code&code=<code>
     &redirect_uri=http://127.0.0.1:<port>/callback
     &client_id=argos-cli&code_verifier=<verifier>
   ```
   → `{ access_token, refresh_token, expires_in, token_type: "Bearer", scope }`.
4. Store both tokens. Send `Authorization: Bearer <access_token>` on API calls;
   refresh with `grant_type=refresh_token` before expiry (the response rotates
   the refresh token — persist the new one).

## MCP clients

MCP clients discover everything from the metadata documents and register via
DCR. On a `401`, the RS returns
`WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`.
Well-known agents (Claude, Codex, Cursor, VS Code, …) are matched against the
curated `known-apps.ts` registry to earn the verified badge + official logo;
self-asserted metadata never confers verification on its own.
