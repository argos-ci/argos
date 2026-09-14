import { SLUG_REGEX } from "@argos/util/slug";
import { describe, expect, it } from "vitest";

import { DEPLOYMENT_SLUG_MAX_LENGTH, generateDeploymentSlug } from "./slug";

const RANDOM_PART = "[a-z1-9]{9}";

describe("generateDeploymentSlug", () => {
  it.each([
    {
      projectName: "web",
      accountSlug: "acme",
      expected: `^web-${RANDOM_PART}-acme$`,
    },
    // The hostname is lowercased on its way to the exact-match lookup, so a
    // slug that kept the original case was unreachable at its own URL.
    {
      projectName: "Docs",
      accountSlug: "AcmeIO",
      expected: `^docs-${RANDOM_PART}-acme-io$`,
    },
    // A dot would split the hostname into two labels, outside the wildcard
    // certificate.
    {
      projectName: "docs.example.com",
      accountSlug: "acme_inc",
      expected: `^docs-example-com-${RANDOM_PART}-acme-inc$`,
    },
  ])(
    "slugifies $projectName / $accountSlug",
    ({ projectName, accountSlug, expected }) => {
      const slug = generateDeploymentSlug({ projectName, accountSlug });
      expect(slug).toMatch(new RegExp(expected));
      expect(slug).toMatch(SLUG_REGEX);
    },
  );

  it("shortens the account slug rather than the random part", () => {
    const slug = generateDeploymentSlug({
      projectName: "p".repeat(60),
      accountSlug: "team-with-a-long-name",
    });

    expect(slug).toMatch(new RegExp(`^${"p".repeat(48)}-${RANDOM_PART}-team$`));
    expect(slug).toHaveLength(DEPLOYMENT_SLUG_MAX_LENGTH);
  });

  it("does not leave a shortened account slug ending in a hyphen", () => {
    // 5 characters remain for the account: "abcd-" minus its hyphen.
    const slug = generateDeploymentSlug({
      projectName: "p".repeat(47),
      accountSlug: "abcd-efgh",
    });

    expect(slug).toMatch(new RegExp(`^${"p".repeat(47)}-${RANDOM_PART}-abcd$`));
    expect(slug).toMatch(SLUG_REGEX);
  });

  it("differs between two deployments of the same project", () => {
    const input = { projectName: "web", accountSlug: "acme" };

    expect(generateDeploymentSlug(input)).not.toBe(
      generateDeploymentSlug(input),
    );
  });
});
