---
name: security-audit
description: Run a deep security audit of Argos — or of one area of it — that ends in verified findings, a fix with a guard test for each contained one, and a private report of the rest. Covers GraphQL and REST authorization, multi-tenant isolation, authentication (sessions, SAML, SCIM, OAuth, passkeys, CLI login, CI tokens), webhooks and outgoing requests, uploads and deployments, and client-side redirects and XSS. Use whenever someone asks for a security audit, pentest, vulnerability hunt or threat-model review, asks to "find security holes" or "check for breaches", wants to know whether tenants or roles are properly isolated, or asks to review an area (SAML, the REST API, webhooks…) for vulnerabilities. For a review of only the pending diff on a branch, the lighter built-in security review fits better.
---

# Security audit

Argos is a multi-tenant SaaS: one tenant must never read or change another's
projects, and a low role must never act as a higher one. A good audit finds
the places where that breaks, proves each one, fixes what can be fixed in one
place, and hands the rest to the user privately.

The last full audit (November 2026) fixed fifteen issues. Fourteen are in
argos-ci/argos#2728, and `main` fixed the other on its own (`591d9e368`). The
PR's commit messages describe each attack and are worth reading before you
start. That audit's lessons are built into this skill:

- `references/threat-model.md`: who the attackers are, what they can reach,
  the bug classes found so far and the areas already checked.
- `references/area-briefs.md`: the six auditor briefs.
- `scripts/graphql_reach.py`: lists every GraphQL field that hands out a
  type. Most of the GraphQL findings came from that blind spot.

A full audit spawns six subagents and takes hours. For one area, use only that
area's brief, and still verify and test the way described below.

## 1. Disclosure comes first

argos-ci/argos is a **public** repository. Anything committed, pushed or put
in a pull request is published, and so is this skill.

- Keep the audit report outside the repository, in your scratchpad. Never put
  an unfixed finding into the repository: not in a commit, a PR, a code
  comment, a test name, an issue, or this skill.
- Fixes carry a cost too. A good commit message describes the attack, and on
  a public repository it is readable as soon as the branch is pushed, before
  the fix is deployed. Say so to the user and let them choose:
  - push only when they are ready to merge and deploy at once, or
  - go through a private GitHub security advisory fork.
- Do not push on your own. The push is the user's call, and the auto-mode
  permission check has refused it before.
- Ask the user whether they keep a list of known findings. Check whether
  each one is fixed, rather than reporting it again as new.

## 2. Prepare the checkout

```bash
git fetch origin main
pnpm install
pnpm build
pnpm run codegen
docker compose up -d
```

- **Build first.** A fresh worktree has no `dist` or generated code.
- **Codegen.** It writes the `schema.gql` the reach script reads. It also
  rewrites `apps/frontend/src/gql`, which is git-ignored: when it is stale,
  the frontend typecheck fails in files you never touched.
- **Look for security work in flight.** Read `git log origin/main` since the
  last audit and the open PRs. During the last audit, `main` fixed one of the
  findings independently while the review was still open.

For a follow-up audit, start with what changed since the last one:

```bash
git log --since=2026-11-03 --stat -- apps/backend/src apps/frontend/src packages
```

New resolvers, handlers and routes are where new holes are. Re-check the
"checked and sound" areas in the threat model only where that log shows they
changed.

## 3. Map the surface

Read `references/threat-model.md`. Then run the reach script from the
repository root:

```bash
python3 .agents/skills/security-audit/scripts/graphql_reach.py
python3 .agents/skills/security-audit/scripts/graphql_reach.py User Project Team
```

- **With no argument**, it ranks every object type by how many fields hand it
  out. It also shows the shortest path to each from a root.
- **With type names**, it lists every field that returns those types.

That second list is the checklist for one question: does each sensitive field
of this type check the viewer itself? Assume it cannot rely on its parent:

- `Query.project` serves public projects to anonymous visitors.
- `Project.account` then hands out the owning team or user.
- Comments, reviews and members hand out users.

Last time, `User.email`, `Team.members` and `Account.metrics` were all safe
from their root query and open through some other edge.

## 4. Fan out the area auditors

Spawn the six briefs in `references/area-briefs.md` as parallel read-only
subagents, in one message. Each brief:

- names the files to read;
- names the bug classes to hunt;
- asks for a fixed report shape: attacker, request, impact, `CONFIRMED` or
  `PLAUSIBLE`, plus what was checked and found sound.

Paste the shared preamble into each one. The "checked and sound" list is what
lets you tell the user what the audit covered, not only what it found.

Reports overlap. Last time the `User` private fields came up in three
reports, and the CLI port and the Teams webhook in two each. Merge findings
by root cause, not by report.

While the auditors run, do the dependency pass yourself:

1. Run `pnpm audit`.
2. For each advisory, ask whether Argos reaches the vulnerable code path.
   Last time, the happy-dom advisories were probed against the real comment
   Markdown→JSON parser and nothing reached the network. That made them an
   upgrade, not a vulnerability.
3. Leave upgrades to the `upgrade-deps` skill; keep them off the audit branch.

## 5. Verify every claim yourself

Auditor reports read as certain, and some are wrong. Before you fix or report
anything:

- **Read the whole path yourself**, from entry point to data. Look for the
  guard the auditor may have missed:
  - a parent resolver;
  - a loader;
  - a model method;
  - a database constraint;
  - a middleware;
  - the REST twin of a GraphQL mutation, or the other way round.
- **Prove it the cheapest way.**
  - Parser and URL claims: a node one-liner, e.g.
    `new URL("http://localhost:@attacker.example/x").host`.
  - Authorization claims: the guard test you will write in step 7.
- **Rate severity** by the attacker's reach × the impact.
  - Reach, from widest: anonymous, then any signed-in user, then a member of
    another team, then a low role in the same team.
  - Impact, from worst: account takeover or cross-tenant data, then
    escalation inside a tenant, then an information leak, then spam.
- **Sort each finding.**
  - **Fix here** when the fix is contained: one guard, one check moved, one
    helper.
  - **Follow-up** when it needs a design decision: a new data model, a
    backfill of stored data, a product trade-off. Propose those as separate
    sessions, with a brief that stays out of the repository.

## 6. Fix

These rules come from what went right and wrong last time.

- **Guard the field on its type, not the entry point.** Every path reaches
  the type, so the check belongs there. Copy the rule a gated sibling already
  uses: `User.sessions` and `User.passkeys` were already "self or staff", so
  `email`, `teams` and the other private fields got the same rule.
- **Copy the twin.** GraphQL `ignoreChange` lacked the check that its REST
  twin had. Use the same rule on both sides, ideally through one shared
  helper. GraphQL `Account.metrics` and REST analytics now share one.
- **Use the locked service.** `leaveTeam` hand-rolled a membership delete.
  The fix routes it through `deleteTeamMembership`, which locks the
  membership set and refuses a non-member.
- **Check frontend consumers before gating a field.** `rg` the field name in
  `apps/frontend/src`.
  - Staff pages read other users' emails, so the rule is self *or staff*.
  - The New Project page reads `glNamespaces` as a non-admin. Throwing there
    blanks the page, so that field returns `null` instead.
- **Keep the error contract.** REST tests expect `403` for a project the
  token knows but may not read. A `404` broke five of them.
- **Re-check stored verdicts.** When a rule changes, rows judged under the
  old rule still exist. The OAuth known-app badge is now re-evaluated when it
  is read, so spoofed registrations already stored lose it too.
- **Remember a cross-site POST has no session cookie.** A SAML ACS POST
  arrives without the `SameSite=Lax` cookie. Any decision that depends on who
  is signed in has to move to the same-origin step that follows it.
- **Write down what users will see.** Every refusal a legitimate user can
  now hit goes into the PR's "What users may notice". A migration goes into
  its deploy notes.

Follow `CLAUDE.md` for everything else: permissions as pure helpers enforced
in the mutation, `invariant` rather than `!`, and migrations with
`structure.sql`.

## 7. Guard tests

Under `CLAUDE.md`'s "What to test", permissions and auth are exactly what
earns a test. Build GraphQL tests on `createApolloServerApp`
(`apps/backend/src/graphql/tests/util.ts`), REST tests on
`createTestHandlerApp` with `supertest`, and data with the `factory`.

- **Follow the real attack path.** One of last time's tests passed without
  the fix: `teamById` already hid the team it queried. The test that counts
  goes the way an attacker would, e.g. an outsider through a public
  project's `account`.
- **Revert to prove it.** Undo the fix, watch the test fail, restore the fix,
  watch it pass. Note which fixes you checked this way; the PR says so.
- **Test one GraphQL field per case.** Once a non-null field errors and nulls
  its parent, graphql-js drops the sibling errors. Use `it.each` over the
  field selections.
- **Use tables for pure helpers.** Redirect validation and known-app
  matching get table-driven unit tests with the attack strings: `//evil`,
  `/\evil`, `https://evil`, `@attacker.example`.
- **Skip a test when the fix is the whole story.** One-place guards (a port
  regex, `redirect: "manual"`) can go without one. Say so in the PR rather
  than writing a test that only restates the line.

## 8. Verify the whole

1. `pnpm run static-checks`
2. Integration tests on a database name of your own:

   ```bash
   PG_DATABASE=secaudit pnpm test:integration
   ```

   Then drop the `secaudit_*` databases. Run the suites through their
   scripts: plain `vitest` picks up the e2e tests and runs them against
   shared Redis.
3. `pnpm test:unit`. Before blaming a failure on a fix, check whether it
   fails on `main` too.
4. A Playwright spec only when a fix changes something the UI shows.

## 9. Commits and the pull request

- **One commit per fix**, in severity order.
  - Use `fix(<scope>)`: a closed hole is something users notice.
  - The message covers who the attacker is and the request they send, what
    the fix changes, and which test guards it.
- **Split shared files.** When two fixes touch one file, write the
  intermediate version to the scratchpad. Stage it with
  `git update-index --cacheinfo 100644,$(git hash-object -w <file>),<path>`,
  and stage the full file in the later commit.
- **Typecheck every commit on its own.** Loop over `origin/main..HEAD` and
  run `pnpm exec tsrs --noEmit` at each commit. A bare `tsrs` is not on a
  script's PATH.
- **PR description**, in this order:
  - **Fixes:** a table of severity, commit and "Before this PR".
  - **What users may notice.**
  - **Deploy notes:** migration order, and in-flight sessions or codes whose
    shape changed.
  - **Testing:** counts, and which guards were checked by revert.

  Open findings stay out of it.
- **Before a rebase**, read what `main` gained. Drop a commit that `main`
  superseded, and confirm with `git range-diff` that the rest are unchanged.

## 10. Report

Write the report to the scratchpad and give the user its full path. Sections:

1. **Fixed:** severity, issue, fix.
2. **Not fixed:** ranked, each with why it needs a decision.
3. **Dependencies:** each advisory, and whether it is reachable.
4. **Checked and sound:** the coverage.

Offer each design-heavy finding as its own follow-up session. If the user
keeps a list of known findings, tell them which ones to add or close.
