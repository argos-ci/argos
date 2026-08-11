---
name: argos-pr-review
description: >
  Review Argos visual regression builds as one input to a pull request review.
  Use when a PR has an Argos build link, an Argos status check, or a bot comment
  pointing to an Argos build, and you need to decide whether the visual diffs
  match the developer's intent before approving.
---

# Argos PR Review

**Argos** is a visual testing platform: each CI build captures screenshots and
compares them to a baseline, producing per-snapshot **diffs**. A build with
`changes-detected` is waiting for a human (or you) to decide whether each change
is intentional, a regression, or a flaky capture.

Treat the Argos build as **one input** to the PR review, never the sole source of
truth. Infer the intended UI change from the PR title, description, linked issue,
and code diff _first_, then use Argos to confirm the rendered result matches.

## Tooling & auth

Drive Argos through the `argos` CLI — load the **argos-cli** skill for the token
model and flags. In short: `build get` / `build snapshots` need a project token
(`ARGOS_TOKEN`/`--token`); submitting a review or comment needs a **personal
access token** (`--token` / `argos login`). Always use `--json` when parsing, and
never print token values. If no PAT is available, give the user your conclusion
and evidence instead of posting — the CLI can't submit the review.

## Workflow

1. **Inspect the build** — `argos build get <ref> --json`. Decide from status:

   | Status                                      | Meaning / next step                                  |
   | ------------------------------------------- | ---------------------------------------------------- |
   | `accepted` / `no-changes`                   | Already approved / no visual diff — no review needed |
   | `pending` / `progress`                      | Not ready — stop and report it can't be reviewed yet |
   | `changes-detected`                          | Needs a decision — fetch snapshots                   |
   | `rejected` / `error` / `aborted`/ `expired` | Don't approve until the cause is understood          |

2. **Fetch what changed** — `argos build snapshots <ref> --needs-review --json`.
   For each diff inspect `url` (diff mask), `base.url` (before), `head.url`
   (after), and `head.metadata`, plus the flakiness signals `test.metrics` and,
   on a change, `change.occurrences` / `change.ignored` (used in step 3).

3. **Judge each diff** against the inferred intent:
   - **Intentional** — matches the code change and renders cleanly.
   - **Regression** — broken layout/overlap, clipping, wrong state/theme/route,
     missing content, or a removed snapshot with no matching test removal.
   - **Flaky** — weigh two independent signals; when they agree, call it flaky
     with confidence:
     - _Test history_ — `test.metrics.flakiness` (0 stable → 1 flaky) and
       `change.occurrences` (how many times this **exact** diff has recurred over
       the metrics period). A high flakiness score or a recurring change is strong
       evidence the diff is environmental noise, not this PR's work; `stability`
       (builds without a change), `consistency` (do changes repeat identically),
       and `uniqueChanges` explain _why_ it scores that way. `change.ignored: true`
       is already known-flaky and auto-approved — never read it as a regression.
     - _This capture_ — a spinner/skeleton, async content not yet loaded,
       mid-animation, drifting dynamic values, `head.metadata.test.retry > 0`, or
       identical `score`/`head.url` across browsers (both captured the same
       transient state). `retries` (the configured budget) is not itself a signal.

     Conversely, a **stable** test (`flakiness`→0, high `stability`, a first-time
     change) that changed is more likely intentional or a real regression — don't
     dismiss it as flaky on the visuals alone. Tune the window with
     `build snapshots --metrics-period <24h|3d|7d|30d|90d>` (default `7d`).

4. **Comment on specific diffs — the highest-value output of an agent review.**
   A binary approve/reject is cheap; specific, anchored feedback is what makes an
   agent review worth reading. For each problem diff, post a comment that names
   what's wrong and how to fix it, anchored to that snapshot:

   ```bash
   argos comment create <ref> --token <pat> --diff <screenshotDiffId> \
     --body "Loader still visible — capture runs before data loads. Wait for settled content (or mark the loader aria-busy)."
   ```

   - `<screenshotDiffId>` is the diff `id` from `build snapshots --json`.
   - Pin to a region with `--anchor-lines <from,to>` or `--anchor-point <x,y>`
     (normalized 0–1); reply in a thread with `--reply-to <commentId>`.
   - Use `--draft` to bundle comments into your pending review, then submit them
     together in the next step.

5. **Submit the review** (or report if no PAT is available):
   - Approve: `argos review create <ref> --token <pat> --event approve`
   - Request changes: `argos review create <ref> --token <pat> --event reject --body "<summary>"`
   - Neutral note only: `--event comment --body "<summary>"`
   - Add `--project owner/project` for build-number refs (not URLs).
   - Silence a **confirmed recurring** flake so it stops blocking future builds:
     `argos change ignore <change.id> --token <pat> --project owner/project`
     (reverse with `change unignore`). Only ignore flakes the metrics confirm —
     never to bypass a real diff; prefer a code fix
     ([references/flaky-fixes.md](references/flaky-fixes.md)) when one exists.
   - Lead with the inferred intent, the snapshots reviewed, and the evidence. In
     the PR, cite the build URL and affected snapshot names; for flakes, name the
     signal and recommend a fix.

## References

- [references/baseline.md](references/baseline.md) — baseline selection and
  orphan-build semantics (load when the review depends on which baseline was used).
- [references/flaky-fixes.md](references/flaky-fixes.md) — concrete code fixes for
  flaky captures (`aria-busy`, `data-visual-test`, animation stabilization).
