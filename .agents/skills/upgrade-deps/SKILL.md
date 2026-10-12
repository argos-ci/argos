---
name: upgrade-deps
description: Upgrade every dependency of the Argos pnpm monorepo to its latest eligible version and close all open Dependabot alerts, ending in one verified pull request whose description lists each security fix. Use whenever someone asks to upgrade, bump or update dependencies or packages, mentions `pnpm upgrade -i -L -r` / `pnpm update -L`, wants Dependabot or npm security alerts fixed, or asks to refresh the lockfile. Use it even for a single vulnerable transitive package, since the release-age, override, patch and held-package checks apply just the same.
---

# Upgrade dependencies

A human runs `pnpm upgrade -i -L -r` and picks versions from the interactive
list. An agent cannot drive that picker, so this skill does the same upgrade
non-interactively. It adds the checks that a plain upgrade skips. The result
is one pull request on a fresh branch. It closes every open Dependabot alert
and moves every direct dependency to its latest eligible version. Its
description says what changed, what was held back and why, and what was
tested.

Two bundled scripts do the bookkeeping. Run them from the repository root:

- `scripts/dependabot_alerts.py` checks each open alert against the
  lockfile. It exits 1 while any alert still resolves to a vulnerable
  version. With `--markdown` it prints the PR's security table.
- `scripts/dep_changes.py` lists every range that changed against
  `origin/main`, grouped as major, minor and patch. It covers manifests,
  the catalog and overrides.

Both live in `.agents/skills/upgrade-deps/scripts/`.

## 1. Start from main

```bash
git fetch origin main
git switch -c chore/upgrade-deps-$(date +%Y-%m) origin/main --no-track
pnpm install --frozen-lockfile
python3 .agents/skills/upgrade-deps/scripts/dependabot_alerts.py
pnpm outdated -r
pnpm peers check > <scratch>/peers-before.txt
```

If the branch name is taken, add the day. The alert list matters: the PR
must account for every alert in it. The peer baseline is for step 3.

## 2. Respect what is held on purpose

Read the comments in `pnpm-workspace.yaml` before upgrading. A package can be
pinned for a reason that still holds. graphql, for example, stays on 16 until
Apollo Server supports 17. Leave such packages out of the update, and ask
before lifting a hold.

## 3. Upgrade

```bash
pnpm update -L -r '!graphql'   # one '!<pkg>' per held package
```

Then work through what the update cannot do on its own.

**A patched dependency moved.** A `patchedDependencies` entry for the old
version stops the update with `ERR_PNPM_UNUSED_PATCH`, and nothing is
written. First check whether upstream fixed the bug: `npm pack` the new
version and read the patched file. If the bug is still there, regenerate the
patch:

1. Run `git init` in the unpacked package.
2. Run `git apply --check` with the old patch, apply it (fix context by hand
   if needed), then `git diff --full-index`.
3. Rename the file and its `patchedDependencies` key to the new version.
4. Compare the patch's `+`/`-` lines with the old ones using `cmp`.

Then run the guard named in the comment above `patchedDependencies`.

**Overrides cap a dependency.** `pnpm update` leaves alone any package an
override controls. Review every entry under `overrides`:

- If it is a CVE floor, raise it to the patched version so the fix cannot
  regress.
- If it holds a direct dependency below a new major, raise it with that
  dependency. Use `pnpm why <pkg>` to see who still depends on it.

Do not delete an override you cannot explain.

**The catalog is not updated.** Bump `catalog:` entries in
`pnpm-workspace.yaml` by hand. Only use versions that `pnpm outdated` listed.

**The 24-hour release age.** pnpm 11 refuses versions published less than a
day ago, and `pnpm outdated` hides them. `pnpm config get minimumReleaseAge`
prints `undefined` anyway. A hand-edited range can still pull such a version
in. The next `pnpm update` then quietly adds it to
`minimumReleaseAgeExclude`, a permanent exemption. Before committing, read
the diff of that list: only `@argos-ci/*` belongs there. To undo a too-young
version:

1. Delete the exclusion and restore the range.
2. Run `pnpm update -r --depth Infinity <pkg>@<previous>`.
3. Put back any `catalog:` specs that command rewrote to literal versions.
4. Run `pnpm install`.

**Duplicates.** Run `pnpm dedupe`. Then look for two copies of a package
whose types cross package boundaries, zod above all:
`grep -oE "^  '?zod@[0-9][^:'(]*" pnpm-lock.yaml | sort -u`. Two copies give
type errors that look like code bugs.

**Alerts still open.** Re-run the alerts script. For a transitive package
that is still vulnerable, run `pnpm update -r --depth Infinity <pkg>` first.
The fix usually fits the parent's range. Add an override only if that fails,
with a comment saying why.

**Peers.** Run `pnpm peers check` again and compare it with the baseline
from step 1. Only issues main did not have matter; an upgrade often clears
some.

## 4. Review the majors

`python3 .agents/skills/upgrade-deps/scripts/dep_changes.py` lists them. For
each major, read its release notes or migration guide, then grep the code for
what it touches. Hand the backend and frontend majors to parallel research
subagents, so the reading happens while you verify.

Type checks catch removed APIs. The reading is for what they cannot catch:
changed defaults, timing, wire formats, API versions. Check exact patch
versions too. jotai 3.0.0 broke `atomWithStorage` restore and 3.0.1 fixed it,
so the range needs a floor of 3.0.1.

Cases that recur. Re-check each one, since upstream moves:

- **stripe.** Each SDK major pins a new Stripe API version. `apiVersion` in
  `apps/backend/src/stripe/index.ts` is typed as that exact string, so the
  type check flags it.
  - Read the version's breaking changes at
    `https://docs.stripe.com/changelog/<release name>`. Check them against
    the fields `src/stripe/` reads and the parameters it sends.
  - Webhook payloads follow each endpoint's own API version, set in the
    Stripe Dashboard. List that upgrade as a follow-up for the user.
- **@playwright/test.** CI runs e2e in `mcr.microsoft.com/playwright:v<version>-jammy`
  (`.github/workflows/ci.yml`). Move the tag to the same version, after
  checking it exists:
  `curl -s https://mcr.microsoft.com/v2/playwright/tags/list`. New browsers
  can shift pixels, so expect the Argos e2e build to show some.
- **oxfmt.** A new version can reformat code. Run `pnpm run format` and
  commit the result with the upgrade.
- **turbo.** Since 2.11 it appends a managed block to `AGENTS.md` (which
  `CLAUDE.md` links to) whenever an agent runs it. `"agentGuidance": false`
  in `turbo.json` stops that. Check `AGENTS.md` is unchanged after turbo
  runs.
- **@base-ui/react.**
  - The tooltip patch (see step 3) needs its guard story.
  - The menu kit's `closeNow` commits the close with `flushSync` before
    unmounting. Base UI 1.9 drops an unmount batched with closing a
    controlled `open`.
  - On every bump, run `tests/build.spec.ts` "says which of the two emptied
    the snapshot list".
- **zod.** 4.6.6 reports a `.max()` failure inside `z.union` as a bare
  "Invalid input". That breaks `createBuild`'s 5000-screenshot "parallel
  mode" error, which `createBuild.e2e.test.ts` guards.
- **graphql.** Held at 16 (see step 2).

## 5. Verify

Run these in order. Each one is cheaper than the next.

1. `pnpm build`
2. `pnpm run static-checks`. This is what CI runs: types, format, lint,
   knip.
3. `pnpm test:unit`
4. Integration tests. They need Postgres, Redis and RabbitMQ:
   `docker compose up -d`. Without RabbitMQ the upload tests time out.

   ```bash
   PG_DATABASE=deps_upgrade_it npx vitest run --config vitest/vitest.e2e.config.mts
   ```

   The private database name keeps other checkouts' runs from dropping
   yours. Drop the `deps_upgrade_it_*` databases afterwards. A timeout under
   load is not a regression until the file fails on its own too.
5. Storybook. Stop any Storybook dev server of this checkout first: they
   share a Vite cache. Then, from `apps/frontend`:

   ```bash
   rm -rf node_modules/.cache/storybook
   npx vitest run --config ./vitest.config.mts --project storybook
   ```

6. Playwright runs in CI. Reproduce a failing spec locally with
   `references/isolated-e2e.md`, which also covers timing failures.

Before blaming a failure on the upgrade, A/B it. Put the suspect package back
to its old version and re-run. If it is a library behavior change, a short
standalone script run against both `npm pack`ed versions proves it in
seconds. That is how the zod 4.6.6 change was pinned down.

## 6. Commit and open the PR

Every commit here is `chore` (see CLAUDE.md: dependency work is never
`feat` or `fix`).

- `chore(deps): upgrade all dependencies` covers manifests, lockfile,
  workspace file, patches, the CI image, formatter output and the code
  changes the majors force.
- Use a separate `chore(<scope>)` commit for each behavior fix or policy
  change a reviewer might want to keep apart or drop.

Build the description from the scripts:

```bash
python3 .agents/skills/upgrade-deps/scripts/dependabot_alerts.py --markdown
python3 .agents/skills/upgrade-deps/scripts/dep_changes.py --markdown
```

Sections:

1. **Security fixes.** The alerts table, every alert linked, with severity,
   the vulnerable version and the locked one.
2. **Major upgrades and what they required.** One bullet per major,
   including "no code change" verdicts and why.
3. **Held back.** Each held package and the reason: a policy hold, a release
   too young, a regression found.
4. **Follow-ups outside the code.** Dashboard settings and similar.
5. **Test plan.** Real counts from step 5. Say which failures were load
   flakes and how you showed it.

After `gh pr create`, watch CI. When e2e fails, the Argos build of that run
holds the failure screenshots, because CI uploads no Playwright artifacts.
