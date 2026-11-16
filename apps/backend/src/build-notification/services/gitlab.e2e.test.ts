import { createServer } from "node:http";
import { invariant } from "@argos/util/invariant";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { processBuildNotification } from "../notifications";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);

/**
 * A GitLab instance that accepts the token but refuses every commit status,
 * as gitlab.com does for a user who can't push to the protected branch.
 */
const gitlab = createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.url === "/api/v4/personal_access_tokens/self") {
    res.end(JSON.stringify({ id: 1, scopes: ["api"], active: true }));
    return;
  }
  if (req.method === "POST" && req.url?.includes("/statuses/")) {
    res.statusCode = 403;
    res.end(JSON.stringify({ message: "403 Forbidden" }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ message: "404 Not Found" }));
});

describe("GitLab commit status refused", () => {
  let gitlabUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) =>
      gitlab.listen(0, "127.0.0.1", resolve),
    );
    const address = gitlab.address();
    invariant(address && typeof address === "object", "server not listening");
    gitlabUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => gitlab.close(resolve));
  });

  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  async function notify(buildId: string) {
    const buildNotification = await factory.BuildNotification.create({
      buildId,
    });
    await processBuildNotification(buildNotification);
  }

  it("emails the owners once instead of failing the job", async () => {
    const account = await factory.UserAccount.create({
      gitlabAccessToken: "glpat-test",
      gitlabBaseUrl: gitlabUrl,
    });
    const gitlabProject = await factory.GitlabProject.create({
      baseUrl: gitlabUrl,
      pathWithNamespace: "acme/web",
      webUrl: "https://gitlab.example.com/acme/web",
    });
    const project = await factory.Project.create({
      name: "web",
      accountId: account.id,
      githubRepositoryId: null,
      gitlabProjectId: gitlabProject.id,
    });
    const bucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
      branch: "main",
    });
    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: bucket.id,
    });

    await notify(build.id);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith({
      type: "gitlab_status_forbidden",
      data: {
        project: { name: "web", url: await project.getUrl() },
        gitlabProject: {
          path: "acme/web",
          url: "https://gitlab.example.com/acme/web",
        },
        branch: "main",
        settingsURL: expect.stringContaining(
          `/${account.slug}/settings/integrations#gitlab`,
        ),
      },
      recipients: [account.userId],
    });

    // Every build hitting the same wall within the week stays quiet.
    await notify(build.id);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });
});
