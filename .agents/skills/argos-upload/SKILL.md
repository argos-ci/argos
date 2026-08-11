---
name: argos-upload
description: >
  Upload a screenshot, an image or a screen recording to Argos and get a
  shareable URL plus ready-to-paste Markdown, so it can be embedded in a pull
  request, an issue, a changelog or a chat message — or attached to a branch or
  pull request, where Argos posts and maintains the comment itself. Use whenever
  you have produced a visual artifact — a Playwright video or trace screenshot, a
  before/after of a UI change, a recording of a reproduction — and need it visible
  to a human who cannot run your shell. GitHub has no public API for comment
  attachments, so this is how an agent working from a terminal gets an image into
  a pull request at all. Also covers reading back the comments a human pinned to
  those screenshots, so you can act on visual feedback you cannot see.
license: MIT
metadata:
  author: argos-ci
  homepage: https://argos-ci.com
  source: https://github.com/argos-ci/argos-javascript
argument-hint: Needs a token (ARGOS_TOKEN, --token, or `argos login`); add `--project <owner/project>` when using a personal access token.
---

# Argos media upload

`argos media upload <files...>` uploads standalone images and videos — not tied
to a build or a test run — and prints a share URL and a Markdown embed for each.

```bash
argos media upload checkout-before.png checkout-after.png --branch feat/checkout
```

Run `argos media --help` for exact flags. This skill covers the parts `--help`
cannot: when to upload, how the result reaches a human, and how to read back what
they say about it.

## When to upload

Upload when a change is **visual** and a human has to see it to judge it:

- You changed UI and are working on a branch or a pull request. A before/after
  pair saves the reviewer from checking out your branch.
- You recorded a Playwright video or a screen recording of a bug reproduction.
- You are reporting a rendering problem that a code snippet cannot convey.

Do **not** upload when text does the job. A stack trace, a diff, a log excerpt
and a list of failing test names are all better as text: searchable, quotable,
and readable in a terminal. An unnecessary screenshot is noise in the review.

Do not upload build screenshots that Argos already has. If a visual test run
produced them, they are already in the build and linked from the pull request —
use `argos build snapshots` instead.

## Getting it into a pull request

Name where the media belongs and Argos does the posting. It keeps **one** comment
per pull request listing every media attached to it, edited in place rather than
appended to.

```bash
argos media upload after.png --pr 1234              # the pull request exists
argos media upload after.png --branch feat/checkout # it does not, yet
```

`--branch` is the one to reach for while working. The media is **staged**: it has
its share URL immediately, and the moment a pull request opens for that branch
Argos attaches it and posts the comment on its own. You do not have to come back
and connect the two. `--pr` publishes straight away.

Passing neither uploads a loose media: a share URL and nothing else. That is the
right call for a chat message or an issue, where you paste the Markdown yourself.
Neither flag is inferred from the environment, CI included — an upload does not
post to a pull request unless you asked it to. Two consequences worth knowing
before you leave them off: nothing will ever attach that media to a pull request,
and since a loose media's identity is only its name, uploading `shot.png` from two
different branches makes them versions of one media rather than two.

Commenting needs the project connected to GitHub, and pull request comments
enabled on it (`argos project get`). Without that the upload still succeeds and
you paste the Markdown yourself.

Two things `--branch` will not do: publish to a pull request opened **from a
fork** (a fork's branch name is chosen by an outsider, so Argos never matches
staged media against it), and publish anything whose bytes never landed.

## Embedding the result

The command prints, per file:

```
checkout.png (after)
  ID: 4821
  staged on feat/checkout
  image/webp · 184 KB · 1440x900 · public · ready
  URL: https://app.argos-ci.com/m/kQ8vN2pXr4tYw7...
  File: https://media.argos-ci.com/media/12/a1b2c3.webp
  Markdown: ![checkout.png](https://app.argos-ci.com/m/kQ8vN2pXr4tYw7...)
```

**Paste the `Markdown` line verbatim.** Do not hand-write the embed:

- For an **image**, the Markdown is a plain `![alt](url)`.
- For a **video**, it is the **poster frame wrapped in a link** to the share
  page. GitHub renders an inline player only for media it hosts itself, so a
  `<video>` tag or a bare `.mp4` link pointing at Argos renders as a dead link.
  The poster-in-a-link is the form that actually shows something.

`URL` is the share page, for a human. `File` is the image or video itself, for
you: fetch it when you want to look at what you just uploaded. Use `--json` when
you parse the output.

## Before/after pairs

A file name ending in `-before` or `-after` is read as a label, not as part of the
name: `checkout-before.png` and `checkout-after.png` both upload as `checkout.png`,
one as each half of a pair, and the pull request comment shows them side by side
for comparison. That is the whole reason to name them that way.

```bash
argos media upload checkout-before.png checkout-after.png --branch feat/checkout
```

`--state before|after` sets it explicitly, for files that are not named that way.
It applies to every file in the command, so do not pass it to a pair — both halves
would land on the same name and state, and the second would replace the first.
The CLI refuses that rather than doing it.

`--description "<prose>"` adds a line under the media in the comment. Use it to
say what the reviewer is looking at when the image does not speak for itself.

## Re-uploading: versions, and one stable link

Uploading the same **name** again on the same branch or pull request adds a
**version** rather than creating a second media. The share URL does not change
and always shows the newest version, so Markdown already posted to a pull request
picks up the new image with nothing to edit — re-run your command after a fix and
the review updates itself.

Byte-identical bytes are not a new version, and cost nothing: Argos recognizes
the file and skips both the transfer and the meter.

A media's name and branch are its identity, so they are fixed once it is
published. While it is still staged you can correct them:

```bash
argos media update 4821 --name checkout.png --branch feat/checkout
argos media update 4821 --no-branch          # detach: nothing will publish it
```

## Reading the feedback you were given

A human can comment on an uploaded screenshot and pin a comment to a **spot** on
it. That is how you get told "this button is misaligned" about a pixel you cannot
look at. Find the media, then read its threads:

```bash
argos media list --branch feat/checkout --json      # or --pr 1234
argos media comment list 4821 --json                # open threads; --all for settled ones
```

`media comment list` shows **open threads only**, so what comes back is what is
left to do. Add `--all` to see the ones already dealt with.

Each comment carries the pin as `Pinned: point x,y` in normalized 0–1 coordinates
of the image (`0.62,0.34` is 62% across, 34% down), and the media's `File:` URL is
what you fetch to go and look. A comment also carries the **media version** it was
written against: if `versionCount` is above 1, the pin describes the bytes of
_that_ upload, so resolve it before trusting the coordinates.

```bash
argos media versions 4821 --json   # match the comment's media version ID, use its file
```

Then close the loop on each thread:

```bash
argos media comment create 4821 --reply-to <threadId> --body "Fixed in abc1234."
argos media comment resolve 4821 <threadId>
```

Resolve only what you actually fixed. Resolving something you skipped is how
feedback gets silently dropped — reply explaining why instead, and leave it open.

## Compression

Images are converted to **WebP** before upload, which is where the speed comes
from: a 1440x900 PNG screenshot goes from ~1 MB to well under 100 KB. The media
keeps the name you gave it (`checkout.png`), because that name is its identity and
must not move when Argos changes how it compresses.

Argos leaves a file alone when converting would not help — a video, an
already-efficient WebP or AVIF, an animated GIF, an image too large for the WebP
encoder (over 16383px on a side, which a long full-page capture reaches), or bytes
that came out no smaller. `--no-compress` uploads exactly what you have.

One consequence worth knowing: converting drops the file's metadata, so a photo's
EXIF — including GPS, if the camera recorded it — does not reach Argos. With
`--no-compress`, or for a format that is left alone, it does.

## Visibility, and what it does not cover

`--visibility` controls the **share page** — `team` requires an Argos session,
`public` does not. It defaults to the most private option the plan allows: `team`
on Pro, and `public` on the free plan, which cannot do `team` at all.

It does **not** protect the file: media files are always reachable at an
unguessable CDN URL, because GitHub fetches embedded images server-side with no
session and could not render them otherwise.

So treat an uploaded file as "anyone with the link". If a screenshot must never be
reachable by someone who obtains its URL, don't upload it — say so instead of
uploading it anyway.

## Authentication

Media belongs to a **project**, so it inherits that project's access — including
transferring with it. With a personal access token, pass `--project
<owner/project>` (or set `ARGOS_PROJECT`); a project token already identifies its
own project.

| Command                         | Token                                                                    |
| ------------------------------- | ------------------------------------------------------------------------ |
| `media upload`, `update`        | Project token (`ARGOS_TOKEN`, or tokenless CI) or PAT with review access |
| `media get`, `list`, `versions` | Project token or PAT with access to the project                          |
| `media delete`                  | Project token or PAT with project admin                                  |
| `media comment …`               | Personal access token (a comment has an author)                          |

Every `media comment` command needs a personal access token, reading included: a
project token can list the media a review is about but not the review itself.

## What it costs

Uploads draw on the same screenshot allowance as visual tests — there is no
separate quota to track. One image is 1 screenshot; one video is 25, because it
costs more to store and serve. Uploading the same file twice is free.

Files are kept 30 days on the free plan and a year on Pro, then deleted, per
version — the plan decides it, there is nothing to pass. An expired link renders
an "unavailable" page, so a pull request embed degrades visibly rather than into a
broken image.

## Limits worth knowing before you upload

- **Accepted formats** — PNG, JPEG, WebP, AVIF, GIF, MP4, WebM, MOV. Anything
  else is refused before the upload starts.
- **Size** — 50 MB on the free plan, 500 MB on Pro. A long screen recording is
  the usual thing that trips this; trim it before uploading.
- **Video codecs** — Argos does not transcode. Most MP4/WebM plays fine, as does
  the H.264 that screen recorders produce; ProRes and some HEVC exports won't play
  inline and the viewer gets a download. Export to H.264 if you need playback.
- **Comment size** — the managed pull request comment lists up to 20 media.
- **No waiting** — a media is fully usable the moment the upload finishes. The
  poster frame is derived by the CDN on request, so a video's Markdown embed is
  correct immediately.
