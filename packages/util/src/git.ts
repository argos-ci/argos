/**
 * Length bounds of a commit sha as people write one: `git log --abbrev-commit`
 * prints seven characters, a full sha is forty.
 */
const MIN_SHA_LENGTH = 7;
const MAX_SHA_LENGTH = 40;

/**
 * Characters that, sitting next to a hex run, mean it is not a standalone sha:
 * word characters (`0xabc1234`, `abc1234z`), `-` (a branch or a hashed asset
 * name like `chunk-abc1234`), `/` (a path, or a URL that already points at the
 * commit) and `#` (a CSS color — `#a1b2c3d4` is eight hex characters).
 */
const BOUNDARY_EXCLUDED = /[0-9A-Za-z_\-/#]/;

/** A commit sha found in a run of text, and where it starts. */
export interface CommitShaMatch {
  sha: string;
  /** Index of the sha's first character in the scanned string. */
  index: number;
}

/**
 * Lowercase only: that is how git prints a sha, and accepting uppercase would
 * widen the net to identifiers and codes ("AB12CD34") for nothing.
 */
function isHex(char: string): boolean {
  return (char >= "0" && char <= "9") || (char >= "a" && char <= "f");
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

/**
 * Whether the character on a side of a hex run allows it to be a sha. The empty
 * string stands for the start or the end of the text, which both qualify.
 */
function isBoundary(char: string): boolean {
  return char === "" || !BOUNDARY_EXCLUDED.test(char);
}

/**
 * Find the commit shas written in a piece of prose, so they can be linked to the
 * repository the text is about.
 *
 * Nothing here can confirm a sha names a real commit, so this is a heuristic on
 * shape: a standalone run of 7–40 hex characters mixing digits and letters.
 * Requiring both keeps out the two believable ways of being wrong — plain
 * numbers ("2000000 users") and hex-only English words ("acceded", "defaced") —
 * at the cost of the ~4% of shas that happen to be all digits. A sha left
 * unlinked reads exactly as it does today; a linked number is a dead link in
 * the middle of someone's sentence.
 *
 * Scanned character by character rather than with a regex: matching stays
 * linear on untrusted input (CWE-1333), and the boundary rules are easier to
 * read spelled out. `charAt` returns "" past either end of the string, which is
 * what makes a sha at the very start or end of the text a boundary match.
 */
export function findCommitShas(text: string): CommitShaMatch[] {
  const matches: CommitShaMatch[] = [];
  let index = 0;
  while (index < text.length) {
    if (!isHex(text.charAt(index))) {
      index += 1;
      continue;
    }
    // Take the whole hex run: a longer one (a sha256, an id) is not a commit
    // sha, so it has to be rejected as a whole rather than trimmed to 40.
    let end = index;
    let digits = 0;
    let letters = 0;
    while (end < text.length && isHex(text.charAt(end))) {
      if (isDigit(text.charAt(end))) {
        digits += 1;
      } else {
        letters += 1;
      }
      end += 1;
    }
    const length = end - index;
    if (
      length >= MIN_SHA_LENGTH &&
      length <= MAX_SHA_LENGTH &&
      digits > 0 &&
      letters > 0 &&
      isBoundary(index === 0 ? "" : text.charAt(index - 1)) &&
      isBoundary(text.charAt(end))
    ) {
      matches.push({ sha: text.slice(index, end), index });
    }
    index = end;
  }
  return matches;
}
