# Baseline And Orphan Build Notes

Load this file when an Argos PR review depends on baseline selection, orphan
build semantics, or how approval affects future comparisons.

---

## Baseline Build

The baseline is the screenshot Argos compares the new build against.

**Approval vs. baseline:** approving a build makes it a candidate for future
baseline selection. It does not directly overwrite the current baseline. The
baseline is selected dynamically each time a new build runs.

Do not say:

```text
Approving this build will update the baseline.
```

Say instead:

```text
Approving this build would make it eligible to be selected as a baseline for future builds on this branch.
```

## Baseline Selection Rules

Argos picks the most recent build satisfying all of:

1. Same build name as the triggered build
2. All framework tests passed
3. Not a subset build
4. Status is auto-approved, manually approved, or orphan
5. Its commit is an ancestor of the merge base between the new build's commit
   and the baseline branch

## Baseline Branch

- Pull requests: the PR base branch
- Push events: the project's configured default baseline branch, usually `main`

## Baseline Overrides

- `ARGOS_REFERENCE_BRANCH`: force a specific branch as baseline
- `ARGOS_REFERENCE_COMMIT`: pin to a specific commit's build

## CI Caveat

If CI does not run on the default branch, the baseline becomes stale and diffs
accumulate. Keep Argos running on the default branch too.

## Orphan Builds

An orphan build has no prior build to compare against, so all snapshots appear
as `added` with `base: null`.

This is expected for:

- the first build in a project
- a branch that has no approved ancestor build yet

The absence of a baseline is not itself a regression signal.

## Review Guidance

When reviewing an orphan build:

- inspect screenshots for obvious layout or rendering problems
- do not treat every `added` snapshot as suspicious just because `base` is null
- approve the build if the screenshots look correct and it is intended to seed a
  future baseline
