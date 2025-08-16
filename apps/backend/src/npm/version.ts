import z from "zod";

import { redisCache } from "@/util/redis";

const TrustedNpmPackageSchema = z.enum([
  "@argos-ci/playwright",
  "@argos-ci/storybook",
  "@argos-ci/cypress",
  "@argos-ci/puppeteer",
]);

type TrustedNpmPackage = z.infer<typeof TrustedNpmPackageSchema>;

/**
 * Check if the passed value is a trusted npm package.
 */
export function checkIsTrustedNpmPackage(
  value: unknown,
): value is TrustedNpmPackage {
  return TrustedNpmPackageSchema.safeParse(value).success;
}

const NpmLatestAPISchema = z.object({
  version: z.string(),
});

const npmLatestVersion = redisCache.createStore({
  fetch: async (pkgName: string) => {
    const res = await fetch(`https://registry.npmjs.org/${pkgName}/latest`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch package info: ${res.status} ${res.statusText}`,
      );
    }

    const raw = await res.json();
    const data = NpmLatestAPISchema.parse(raw);
    return data.version;
  },
  getCacheKey: (pkg) => ["pkg-latest", pkg],
});

/**
 * Get the latest version of a npm package.
 */
export async function getLatestPackageVersion(name: TrustedNpmPackage) {
  return npmLatestVersion.get(name);
}
