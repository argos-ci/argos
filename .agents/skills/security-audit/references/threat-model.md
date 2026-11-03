# Argos threat model

Read this before auditing, and give it to every area auditor. It says who
attacks, with what, and what they can reach. It also lists the bug classes
already found and the areas already checked, as of 2026-11-03.

## Attackers, from widest reach

- **Anonymous visitors** reach:
  - public projects through `Query.project`, and everything that hangs off
    them;
  - media through `Query.mediaByShareToken`;
  - a team through `Query.invite` with an invite secret;
  - the REST operations declared with `noAuth`;
  - OAuth dynamic client registration (`POST /oauth/register`);
  - the login, SAML and webhook routes.
- **Any signed-in user.** This is free and instant. They are admin of their
  own personal account, so `getAdminAccount` passes for it. They can create
  teams, projects, webhooks and OAuth clients of their own, and point them at
  infrastructure they control.
- **Members of a team**, by `TeamUser.userLevel`:
  - `owner` > `member` > `contributor`.
  - A contributor reaches only the projects granted to them: a
    `project_users` row (`admin` / `reviewer` / `viewer`) or the project's
    `defaultUserLevel`.
  - Checking account membership is not checking project permission.
- **Former members.** Some rows outlive membership: `project_users`, token
  scopes, notification subscriptions. Anything keyed on such a row has to
  re-check current access.
- **A team's own infrastructure.** To Argos, a team admin's SAML IdP, SCIM
  client, Logic App or Discord server, and the branch names and commit
  messages their CI sends, are attacker-controlled input. A team must never
  gain power over a user it does not own.
- **Project token holders**: whoever runs the project's CI. They write
  builds, screenshots and deployments, so every string and file they send is
  untrusted.
- **Staff.** Staff-only surfaces go through `assertStaff` (`Staff.ts`).

## Credentials and where they are accepted

- **Session cookie** (HttpOnly, Secure, `SameSite=Lax`): GraphQL and
  `/api/auth/*`. A custom CSRF header is required whenever the cookie is
  present.
  - A cross-site POST, like a SAML ACS, arrives without the cookie. It cannot
    know who is signed in.
- **Personal access tokens and OAuth access tokens**: REST v2 and MCP.
  - Each operation declares its scheme and scopes in `api/security.ts`.
  - A token's account scope says which accounts it may act on. Project-level
    permission still has to be checked on top of it.
  - CLI-issued tokens never expire.
- **Project tokens** (`projectTokenAuth`): the CI endpoints. Short-lived
  project tokens come from the GitHub Actions exchanges.
- **SCIM bearer token**: `/scim`, scoped to one team.
- **SAML**: the ACS issues a one-time code, which the frontend exchanges at
  `/api/auth/saml`.

## Identifiers are not secrets

- Database ids are sequential bigints.
- The public ids are sqids (`src/util/sqids.ts`) over those same sequential
  ids. Treat them as guessable, whatever the alphabet.
- Composite ids carry several references, e.g. a test change id. Load each
  reference and check it belongs to the parent you authorized.

## Content Security Policy

- The app's CSP has no `'unsafe-inline'` in `script-src`, and framing is
  denied. That is what stops a `javascript:` URL that reaches `location`
  today. Report the reach anyway: the CSP is a backstop, not the fix.

## Bug classes found so far

All fixed, in argos-ci/argos#2728 unless noted. Hunt for new instances of each
one.

| Class                                         | What happened                                                                                                                                                                                                                                                                                              | Where to look again                                                                                                                                                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Object handed out by an unchecked edge        | `Project.account` on a public project led to `Account.metrics`, which listed private projects. Comment authors led to `User.email`, `teams` and access tokens. A public project's account led to `Team.members`. Leftover contributor rows led to `ProjectContributor.project`.                              | `scripts/graphql_reach.py <Type>`. Every sensitive field checks the viewer itself.                                                                                                                                                                  |
| Child id not bound to the authorized parent   | GraphQL `ignoreChange` read another tenant's test, and through it the whole project. Its REST twin had the check.                                                                                                                                                                                         | Every id in a mutation's input: load it and compare its parent. Diff each mutation against its REST twin in `src/api/handlers`.                                                                                                                    |
| Check after an early return                   | `PUT /v2/builds/{id}` returned a finished build before checking it belonged to the token's project.                                                                                                                                                                                                       | Read handlers top to bottom. A `return` before the authorization check is the bug.                                                                                                                                                                 |
| Mutation bypassing the service invariant      | `leaveTeam` deleted membership by hand. A non-member call promoted both members of a two-person team to owner.                                                                                                                                                                                            | Mutations writing membership, roles or ownership directly instead of through `src/database/services`.                                                                                                                                              |
| Account scope taken as project permission     | A contributor's token read projects they were never given over REST. Fixed on `main` in `591d9e368`.                                                                                                                                                                                                       | Anything that checks `account` membership and then serves a project.                                                                                                                                                                               |
| Tenant-controlled identity linked by email    | Any team's SAML IdP could assert an email and sign in as that existing user, staff included.                                                                                                                                                                                                              | Link an existing account only on proof: a subject already bound, the user signed in at the time, or an account this team's SCIM created.                                                                                                          |
| URL built by string interpolation             | `http://localhost:${port}` with `port=@attacker.example` sent the CLI login code to the attacker.                                                                                                                                                                                                         | Template-string URLs fed by input. Build with `URL`, set components, and check numbers are numbers.                                                                                                                                                |
| Redirect checked by prefix                    | `startsWith("/")` accepted `//evil` and `/\evil`. The frontend used `r` after login without any check.                                                                                                                                                                                                    | Resolve against the app origin with `URL` and compare origins.                                                                                                                                                                                      |
| Self-asserted metadata granting trust         | An OAuth client registered with `software_id: "claude-code"` showed as verified "Claude" while its codes went to the attacker.                                                                                                                                                                            | Trust only what the registrant cannot choose, or what is tied to where the codes go. Re-check stored verdicts.                                                                                                                                     |
| Allowlist checked before redirects            | The Microsoft Teams webhook checked the first host, then followed redirects anywhere (SSRF).                                                                                                                                                                                                              | Every `fetch` to a tenant-supplied URL: `redirect: "manual"`.                                                                                                                                                                                       |
| Partial escaping                              | Slack links escaped the label but not the URL, so a branch name injected `<!channel>`.                                                                                                                                                                                                                    | Encode every interpolated part, in the target syntax: Slack `<url\|label>`, Markdown, HTML attributes.                                                                                                                                             |

## Checked and found sound

As of 2026-11-03. Re-check one of these only when `git log` shows its code
changed.

- **Sessions.**
  - 32 random bytes per token, stored as SHA-256.
  - Every login issues a new token, so there is no fixation.
  - Logout is a POST behind CSRF.
- **CSRF and CORS.** The header is required whenever the cookie is present.
  CORS allows only the app origin with credentials.
- **Email code login.** 6 digits, 15-minute life, verified atomically in
  Redis, and the email locks after 5 failures.
- **Passkeys.**
  - Single-use challenge.
  - rpId and origins come from config.
  - User verification is required.
  - The counter is checked.
  - Passkey operations need a session.
- **SAML against an outside attacker.**
  - Signatures are required.
  - Issuer, audience, destination, recipient and timing are checked.
  - InResponseTo is bound to the login.
  - Replay is blocked per team.
  - The code is single-use and lives 5 minutes.
- **OAuth server.**
  - `redirect_uri` must match exactly, apart from the loopback port.
  - PKCE S256 is mandatory.
  - Codes are single-use and bound to client and redirect.
  - Refresh tokens rotate, with reuse detection.
  - Scopes can only narrow.
  - Membership is re-checked on every request.
  - Client secrets are compared in constant time.
- **MCP.** Project tokens are refused. Scopes are enforced per operation
  through the REST API.
- **SCIM.** The token is hashed, every route is scoped to its team, and it
  never changes a user's global email.
- **Incoming webhook signatures.**
  - GitHub: computed over the raw body.
  - Stripe: `constructEvent` on the raw body.
  - Slack: Bolt, with a timestamp check.
  - Origin: Ed25519 with a ±5 minute window and delivery dedupe.
  - Resend: HMAC.
- **GraphQL mutations.**
  - Admin mutations go through `getAdminAccount`, `getAdminProject`,
    `assertTeamAdmin` or `assertProjectAdmin`.
  - Review diff ids are bound to their build.
  - Comment JSON is validated against the ProseMirror schema.
  - Mentions are re-parsed and limited to project members.
- **Frontend.**
  - No `dangerouslySetInnerHTML` on user data.
  - React rewrites `javascript:` hrefs.
  - React Router refuses external `navigate` targets.
  - No tokens in web storage.
  - `/config.js` holds public values only.
- **Outgoing requests.**
  - Discord webhooks use an exact host allowlist.
  - The npm, changelog, skills and JWKS URLs are fixed.
  - `gitlabBaseUrl` is not user-settable.
- **Deployment access.** The JWT is compared with `timingSafeEqual` and bound
  to its project, and `return_to` is restricted.
- **Client IP.** `trust proxy` is 1, and `CF-Connecting-IP` is honoured only
  from Cloudflare ranges.
