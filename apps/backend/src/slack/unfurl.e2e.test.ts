import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { formatTestId } from "@/util/test-id";

import { matchBuildPath, matchTestPath, unfurlTest } from "./unfurl";

describe("matchTestPath", () => {
  it("matches a test URL and extracts its params", () => {
    expect(
      matchTestPath("/acme/my-project/tests/MY-PROJECT-RJFGK"),
    ).toMatchObject({
      params: {
        accountSlug: "acme",
        projectName: "my-project",
        testId: "MY-PROJECT-RJFGK",
      },
    });
  });

  it("does not match a build URL", () => {
    expect(matchTestPath("/acme/my-project/builds/42")).toBe(false);
  });

  it("does not collide with the build matcher", () => {
    expect(matchBuildPath("/acme/my-project/tests/MY-PROJECT-RJFGK")).toBe(
      false,
    );
  });
});

describe("unfurlTest", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("unfurls a test owned by the account", async () => {
    const account = await factory.TeamAccount.create({
      slug: "acme",
      name: "Acme Inc",
    });
    const project = await factory.Project.create({
      name: "my-project",
      accountId: account.id,
    });
    const test = await factory.Test.create({
      projectId: project.id,
      name: "Home page",
    });
    // A screenshot diff gives the unfurl its preview image.
    await factory.ScreenshotDiff.create({ testId: test.id });

    const attachment = await unfurlTest(
      {
        accountSlug: "acme",
        projectName: "my-project",
        testId: formatTestId({ projectName: project.name, testId: test.id }),
      },
      { accountId: account.id },
    );

    invariant(attachment);
    expect(attachment.title).toBe("Home page — Acme Inc/my-project");
    expect(attachment.fields).toContainEqual({
      title: "Flakiness",
      value: "0%",
    });
    expect(attachment.fields).toContainEqual({
      title: "Stability",
      value: "100%",
    });
    expect(attachment.image_url).toBe(
      "https://files.argos-ci.com/test/test-s3-id",
    );
  });

  it("does not unfurl a test that belongs to another account", async () => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    const otherAccount = await factory.TeamAccount.create({ slug: "other" });
    const project = await factory.Project.create({
      name: "my-project",
      accountId: account.id,
    });
    const test = await factory.Test.create({ projectId: project.id });

    const attachment = await unfurlTest(
      {
        accountSlug: "acme",
        projectName: "my-project",
        testId: formatTestId({ projectName: project.name, testId: test.id }),
      },
      // The link was shared in another account's Slack workspace.
      { accountId: otherAccount.id },
    );

    expect(attachment).toBeNull();
  });

  it("does not unfurl when the project name does not match the URL", async () => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    const project = await factory.Project.create({
      name: "my-project",
      accountId: account.id,
    });
    const test = await factory.Test.create({ projectId: project.id });

    const attachment = await unfurlTest(
      {
        accountSlug: "acme",
        projectName: "another-project",
        testId: formatTestId({ projectName: project.name, testId: test.id }),
      },
      { accountId: account.id },
    );

    expect(attachment).toBeNull();
  });

  it("returns null for an unparseable test id", async () => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await factory.Project.create({ name: "my-project", accountId: account.id });

    const attachment = await unfurlTest(
      {
        accountSlug: "acme",
        projectName: "my-project",
        testId: "not a valid test id",
      },
      { accountId: account.id },
    );

    expect(attachment).toBeNull();
  });
});
