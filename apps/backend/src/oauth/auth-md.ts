//
// `/auth.md` (https://workos.com/auth-md): the procedural recipe an agent
// follows to get credentials for Argos — discover, register, claim, exchange,
// use, revoke.
//
// It is the document the `agent_auth.skill` field of the Authorization Server
// metadata points at, and it is generated from the very same metadata and
// scope catalog the server enforces, so the instructions cannot drift from the
// endpoints. Served on the app origin; `argos-ci.com/auth.md` proxies it.
//
import {
  getApiResourceUrl,
  getAuthorizationServerMetadata,
  getMcpResourceUrl,
  getProtectedResourceMetadataUrl,
} from "./metadata";
import { OAUTH_SCOPES, OAUTH_SCOPE_LIST } from "./scopes";

const API_DOCS_URL = "https://argos-ci.com/docs/api-reference";
const MCP_DOCS_URL = "https://argos-ci.com/docs/agents/mcp-server";

export function getAuthMd(): string {
  const meta = getAuthorizationServerMetadata();
  const apiUrl = getApiResourceUrl();
  const mcpUrl = getMcpResourceUrl();
  const scopeLines = OAUTH_SCOPE_LIST.map(
    (scope) => `- \`${scope}\` — ${OAUTH_SCOPES[scope].description}`,
  ).join("\n");

  return `# Argos auth.md

How AI agents and automated clients authenticate to [Argos](https://argos-ci.com),
the visual testing platform.

## Who this is for

Agents calling the [Argos REST API](${API_DOCS_URL}) (\`${apiUrl}\`) or
connecting to the [Argos MCP server](${MCP_DOCS_URL}) (\`${mcpUrl}\`). Both
accept the same bearer tokens, issued by the Argos authorization server at
\`${meta.issuer}\`.

Argos accounts belong to people: an agent always acts on behalf of a user who
signs in and grants it access. Registration is open to anonymous agents, and
the resulting client can do nothing until a user claims it by granting consent.

## 1. Discover

- Authorization server metadata (RFC 8414): \`${meta.issuer}/.well-known/oauth-authorization-server\`
- Protected resource metadata (RFC 9728): \`${getProtectedResourceMetadataUrl()}\` and \`${mcpUrl}/.well-known/oauth-protected-resource\`
- API catalog (RFC 9727): \`https://argos-ci.com/.well-known/api-catalog\`
- MCP server card: \`${mcpUrl}/.well-known/mcp/server-card.json\`

## 2. Register

\`POST ${meta.registration_endpoint}\` with your client metadata (RFC 7591
dynamic client registration). No credentials or pre-existing identity are
required. The response carries your \`client_id\`.

\`\`\`http
POST ${new URL(meta.registration_endpoint).pathname} HTTP/1.1
Host: ${new URL(meta.issuer).host}
Content-Type: application/json

{
  "client_name": "My Agent",
  "redirect_uris": ["http://127.0.0.1:8976/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
\`\`\`

## 3. Claim

Send the user to \`${meta.authorization_endpoint}\` to run the authorization
code flow with PKCE (\`S256\`). They sign in, choose which organizations to
share, and grant scopes. This is what turns an anonymous registration into an
authorized client.

## 4. Exchange

\`POST ${meta.token_endpoint}\` with the authorization code and your PKCE
verifier to receive an \`access_token\` and a \`refresh_token\`. Refresh tokens
are supported; use them rather than sending the user through consent again.

## 5. Use

Send the token as a bearer credential:

\`\`\`http
Authorization: Bearer <access_token>
\`\`\`

### Scopes

${scopeLines}

Scopes only ever narrow what the authenticating user is already allowed to do —
they never widen it.

## 6. Revoke

- Revoke a token at \`${meta.revocation_endpoint}\` (RFC 7009).
- Users revoke an agent's access at any time from **Authorized applications**
  in their Argos settings. Treat a \`401\` as "re-run the flow from step 3".

## Alternative: personal access token

Where OAuth is impractical, a user can create a personal access token in their
Argos settings and hand it to the agent. It is used the same way (step 5). See
the [API reference](${API_DOCS_URL}).

## Support

Rate limits are documented in the [API reference](${API_DOCS_URL}).
Questions: contact@argos-ci.com or https://argos-ci.com/discord.
`;
}
