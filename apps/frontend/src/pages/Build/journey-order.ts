import { getRepositoryPath } from "./sidebar/metadata/repository-path";

type FiledTest = {
  key: string;
  prefix: string;
  location: { file: string } | null;
  /** The test's screens that need a review, in all its runs. */
  changedCount: number;
};

export type JourneyFile<T> = {
  key: string;
  /** The file's path in the repository, when the test has a location. */
  path: string | null;
  /** The folders before the file name in that path. */
  dir: string | null;
  /** The file name, or the title path when the test has no location. */
  name: string;
  tests: T[];
};

/**
 * `tests` by the file that holds them, the files in the order their first
 * test comes in.
 */
function groupTestsByFile<T extends Omit<FiledTest, "changedCount">>(
  tests: readonly T[],
): JourneyFile<T>[] {
  const files = new Map<string, JourneyFile<T>>();
  for (const test of tests) {
    const path = test.location ? getRepositoryPath(test.location.file) : null;
    const key = path ?? test.prefix;
    const nameStart = path ? path.lastIndexOf("/") + 1 : 0;
    const file: JourneyFile<T> = files.get(key) ?? {
      key,
      path,
      dir: path && nameStart > 0 ? path.slice(0, nameStart) : null,
      name: path ? path.slice(nameStart) : test.prefix,
      tests: [],
    };
    files.set(key, file);
    file.tests.push(test);
  }
  return Array.from(files.values());
}

export type JourneyTestGroups<T> = {
  changed: JourneyFile<T>[];
  unchanged: JourneyFile<T>[];
};

/**
 * The tests in the order a review goes through them, the overview's: the
 * changed ones by file, the most changed first, then the unchanged ones by
 * file, apart. A file holding both is in each.
 */
export function groupTestsForReview<T extends FiledTest>(
  tests: readonly T[],
): JourneyTestGroups<T> {
  const sorted = tests.toSorted(
    (a, b) => b.changedCount - a.changedCount || a.key.localeCompare(b.key),
  );
  return {
    changed: groupTestsByFile(sorted.filter((test) => test.changedCount > 0)),
    unchanged: groupTestsByFile(
      sorted.filter((test) => test.changedCount === 0),
    ),
  };
}

/** The tests of `groups`, one after the other in the review's order. */
export function getTestsInReviewOrder<T>(groups: JourneyTestGroups<T>): T[] {
  return [...groups.changed, ...groups.unchanged].flatMap((file) => file.tests);
}

/**
 * The files of `groups` as a menu lists them: the unchanged ones after a
 * separator, so a file holding both kinds of tests is named in each part.
 */
export function listJourneyTestFiles<T>(groups: JourneyTestGroups<T>): {
  key: string;
  file: JourneyFile<T>;
  separated: boolean;
}[] {
  return [
    ...groups.changed.map((file) => ({
      key: `changed:${file.key}`,
      file,
      separated: false,
    })),
    ...groups.unchanged.map((file, index) => ({
      key: `unchanged:${file.key}`,
      file,
      separated: index === 0 && groups.changed.length > 0,
    })),
  ];
}
