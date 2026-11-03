# Area auditor briefs

Six read-only auditors, spawned in parallel in one message. Each prompt is
the shared preamble, then that area's brief. Replace `<repo>` with the
checkout's absolute path. For a narrower audit, spawn only the briefs whose
area it touches.

The areas overlap on purpose, at the edges: a GraphQL auditor that follows a
`User` edge into another area should report it. You merge by root cause
afterwards.

## Shared preamble

```text
You are auditing Argos for security vulnerabilities. Argos is a multi-tenant
visual-testing SaaS. Repository: <repo> (work only there, edit nothing).
Backend: Express + Apollo GraphQL + Objection/Knex in apps/backend. Frontend:
React + Vite + Apollo in apps/frontend. Shared code: packages/.

Read CLAUDE.md first, then
.agents/skills/security-audit/references/threat-model.md. It lists the
attackers and their credentials, the bug classes found in earlier audits
(hunt for new instances of each in your area), and the areas already checked
(skip them unless their code changed since that date).

RULES:
- Trace every candidate end to end before reporting. Check whether a guard
  elsewhere already blocks it: the parent resolver, a loader, a model method,
  a database constraint, a middleware, a zod schema. Drop it if one does.
- Report real, exploitable issues only, not hardening wishes or style.
- Do not edit any file. Throwaway node one-liners to check how a parser or
  library behaves are fine.

REPORT, concise and ranked by severity. For each finding:
- file:line;
- the attacker: anonymous / any signed-in user / member of another team / a
  low role in the same team / holder of a token for project X…;
- the concrete request or steps they use;
- the impact;
- confidence: CONFIRMED when you read the full path, PLAUSIBLE when one link
  is unverified (say which).
Then a short list of what you checked and found sound, so coverage is clear.
```

## 1. GraphQL: accounts, teams, users, projects, billing

```text
YOUR AREA: GraphQL authorization for accounts, teams, users, projects and
billing.
Files, under apps/backend/src/graphql/:
- definitions/: Account, AccountSubscription, Team, TeamScim, User,
  UserAccessToken, UserPasskey, UserSession, Staff, Project, Invoice, Plan,
  OAuthClient, OAuthGrant, NotificationPreference, Deployment, and the
  GitHub/GitLab/Origin/Slack installation and repository types;
- context.ts, apollo.ts, util.ts, ws.ts, loaders.ts and services/.
Plus the permission helpers and services those resolvers call:
apps/backend/src/database/services, and the $getPermissions methods of the
Account, Project and Team models.

First run, from <repo>:
  python3 .agents/skills/security-audit/scripts/graphql_reach.py Account Team User Project
It lists every field that hands out those types. A type's sensitive fields
must check the viewer themselves: a public project hands its account to
anonymous visitors, and comments, reviews and member lists hand out users.

Look for:
- IDOR: acting on an account, team, project or user by id or slug without
  checking the caller's membership or role.
- Privilege escalation: member → owner, removing the last owner, accepting
  an invite meant for someone else, reusing invite tokens, email-domain
  auto-join without a verified email.
- Mutations that write membership or roles by hand instead of through the
  locked services.
- Staff-only operations reachable by non-staff.
- Project transfer to an account you do not administer.
- Field-level leaks to people who can see the parent but not the field:
  personal data, credentials and tokens, configuration, anything an admin
  page shows.
- Rows that outlive membership (project_users, token scopes) still granting
  access.
- Public vs private visibility mistakes.
- Subscription (ws.ts) authorization.
- Unbounded queries that are trivially DoS-able.
```

## 2. GraphQL: builds, reviews, comments, media, tests, automations

```text
YOUR AREA: GraphQL authorization for builds, reviews, comments, media, tests,
automations and notification webhooks.
Files:
- apps/backend/src/graphql/definitions/: Build, BuildReview, BuildReviewer,
  BuildNotificationSubscription, Comment, Media, Screenshot,
  ScreenshotBucket, ScreenshotDiff, Test, TestChange,
  TestNotificationSubscription, AutomationRule, DiscordWebhook,
  MsTeamsWebhook, Agent, PullRequest, Repository;
- apps/backend/src/graphql/: buildAccess.ts, mediaAccess.ts, testAccess.ts,
  loaders.ts;
- apps/backend/src/: comment/ (permissions.ts, mentions.ts, schema.ts and
  services), automation/, discord/, msteams/, media/, build-notification/.

First run, from <repo>:
  python3 .agents/skills/security-audit/scripts/graphql_reach.py Build Test TestChange Comment Media ScreenshotDiff

Look for:
- IDOR: reviewing, commenting on, approving or ignoring a build, diff, test
  or media of a project the caller cannot access, or can only see as public.
- Reference mixing: an id from project B passed alongside a project or build
  from project A (screenshotDiffId with buildId, a comment thread from
  another build, a parent comment from another project).
- Ids carried inside composite or encoded ids (change ids, sqids). Each part
  must be checked against the authorized parent; ids are guessable.
- Each mutation against its REST twin in apps/backend/src/api/handlers: does
  one check something the other does not?
- Read-only viewers of a public project performing writes.
- Editing or deleting other users' comments or reactions.
- Mention injection notifying or exposing users outside the project.
- Comment JSON accepted without schema validation: stored XSS through link
  marks, or HTML injection in emails.
- Automation rules and Discord/Microsoft Teams webhooks enabling SSRF
  (internal addresses, cloud metadata, redirects) or exfiltration.
- Notification subscriptions to builds you cannot see.
- Loaders keyed by id without project scoping.
```

## 3. REST API v2 and CI authentication

```text
YOUR AREA: the public REST API v2 and CI authentication.
Files, under apps/backend/src/:
- api/: security.ts, schema.ts, util.ts, request-context.ts, auth/*,
  handlers/*, schema/*;
- web/api/: v2.ts, builds.ts, auth.ts, argosHeaders.ts, index.ts;
- storage/: signed URLs, uploads, public URLs;
- the build and screenshot upload paths reached from createBuild,
  updateBuild and finalizeBuilds;
- deployment/ and the deployment handlers;
- api/handlers/media.ts.
To list each operation with its security requirement:
  rg -n 'operationId|security:' apps/backend/src/api/handlers

Look for:
- An operation whose declared security does not match what the handler
  enforces: a project token on a user or team endpoint, a read scope that
  writes.
- Account scope taken as project permission: a user token reaching a
  project of its account that the user was never given.
- A `return` before the authorization check (short-circuits, retries,
  "already complete" paths).
- IDOR through path params: account slug, project name, build number, diff
  id, test id belonging to a project other than the authenticated one.
- GitHub Actions OIDC and tokenless exchanges: can a fork or another
  repository's workflow get a token for my project? Audience, issuer,
  repository id and owner checks, replay.
- Short-lived project tokens and the CLI token exchange: binding, expiry,
  scope.
- User access token scopes and expiry. Timing-safe token comparison.
- Uploads: can one tenant's upload overwrite another tenant's files? Size
  limits.
- Deployments: isolation between tenants' hostnames and content.
- Mass assignment through request bodies. Pagination limits.
```

## 4. Authentication, sessions and identity

```text
YOUR AREA: authentication, sessions and identity.
Files, under apps/backend/src/:
- auth/: sessions, login, email login, passkeys, SAML, GitHub/GitLab/Google
  login, OAuth and user access tokens, payload;
- web/auth-saml.ts, web/api/auth.ts, web/middlewares/{csrf,cors}.ts, and the
  login/logout routes in web/app-router.ts;
- oauth/ (the authorization server), mcp/, scim/;
- the user and account creation and linking code they call: account/,
  github/, gitlab/, google/, database/services/account.ts.
Frontend side: apps/frontend/src/util/{oauth,welcome,saml}.ts and the auth
pages under apps/frontend/src/pages.

Look for:
- Account takeover by linking an identity through an unverified or
  attacker-chosen email (GitHub, GitLab, Google).
- A team-controlled IdP or SCIM client gaining power over users the team
  does not own (see the threat model).
- Login CSRF: missing or unchecked `state`.
- Open redirects in `redirect`, `next`, `r` after login or logout, including
  checks by string prefix (`//host`, `/\host`).
- Session fixation. Cookie flags and domain scope across subdomains.
- CSRF on cookie-authenticated state-changing endpoints (GraphQL POST, form
  posts, the SAML ACS).
- Passkeys: challenge binding, origin and rpId, counter, user verification.
- SAML: signature on assertion vs response, XML signature wrapping,
  audience, recipient, InResponseTo and NotOnOrAfter, IdP-initiated login,
  replay.
- OAuth server: redirect_uri matching, PKCE, code reuse, client
  authentication, scope escalation on refresh, revocation, and dynamic
  client registration abuse (self-asserted names, logos, "verified" badges).
- MCP: token audience, which scopes reach which tools.
- SCIM: is the token scoped to its own team? Can it touch users' global data?
- Token storage (hashed?) and constant-time comparison.
- Email change and magic-link flows. Rate limiting on login and
  verification codes.
```

## 5. Web layer, webhooks and outgoing requests

```text
YOUR AREA: the HTTP web layer, incoming webhooks and outgoing requests.
Files, under apps/backend/src/:
- web/: app.ts; app-router.ts (skip the login routes, brief 4 has them);
  media-share.ts, deployment-access.ts, invoice-documents.ts,
  security-headers.ts, client-ip.ts, agent-discovery.ts, util.ts;
  middlewares/; api/stripe.ts; api/status.ts;
- slack/, github/, gitlab/, stripe/, synchronize/, origin/,
  origin-pull-request/, github-pull-request/, git-platform/, notification/,
  email/, build-notification/, deployment-notification/, screenshot-diff/,
  npm/, changelog/, skills/, agent/, util/.

Look for:
- Webhook signature verification (GitHub, GitLab, Stripe, Slack, Resend,
  Origin): missing, skippable, computed over a re-serialized body, not
  constant-time, replayable.
- SSRF wherever the server fetches a URL that a user or a webhook payload
  influences, including redirects followed after an allowlist check.
- Stored XSS from user-uploaded content served on an origin that shares
  cookies with the app: Content-Type, Content-Disposition, nosniff, CSP,
  sandboxing.
- Path traversal.
- Host or X-Forwarded-* headers injected into generated links (login emails,
  invites) or into rate-limit keys.
- Injection into emails and Slack, Discord or Teams messages built from user
  strings: build names, branch names, commit messages, comment text. Check
  every interpolated part, not only the visible label.
- Error handlers leaking stack traces or secrets.
- Security headers: CSP, frame-ancestors, CORS with credentials and
  reflected origins.
- Integration callbacks: authorization of the account they act on.
- Resource exhaustion from uploaded files.
```

## 6. Frontend: XSS, redirects, client-side trust

```text
YOUR AREA: client-side security of apps/frontend/src and packages/. Many
strings shown in the UI come from untrusted sources:
- CI metadata sent through the public API by anyone holding a project token:
  build name, branch, commit message, PR title, test names, file paths,
  screenshot metadata, test and CI job URLs;
- comment content (TipTap JSON);
- user names and avatars, team names;
- GitHub and GitLab pull request data;
- deployment URLs.

Look for:
- dangerouslySetInnerHTML or innerHTML with any non-constant input.
- href, src, window.open and location assignments from data that can carry
  `javascript:` or `data:` URLs. Trace each to its source and check whether
  the backend or a helper restricts the scheme.
- URLs built from template strings with query-string input, e.g.
  `http://localhost:${port}`, where userinfo (`@host`) can change the host.
- TipTap/ProseMirror rendering of link marks, mention nodes and pasted
  HTML. Markdown rendering.
- Open redirects: `redirect`, `next`, `r`, `returnTo` after login, OAuth
  consent, SAML, invites, checkout. Can they reach another origin or a
  `javascript:` URL?
- The OAuth consent page: does it show the real client and redirect host?
  Can it be framed?
- postMessage listeners without origin checks. Iframes with user content and
  no sandbox.
- Tokens or secrets in localStorage, sessionStorage, URLs or referrers.
- The runtime config injected via /config.js: anything secret, anything
  injectable?
- Third-party script injection. CSS injection through user-controlled style
  values.
```
