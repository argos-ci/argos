import request from "supertest";
import { test as base, beforeAll, describe, expect } from "vitest";
import z from "zod";

import {
  Account,
  Comment,
  Media,
  Project,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { createComment } from "./createComment";
import { listComments } from "./listComments";
import { resolveCommentThread } from "./resolveCommentThread";

const app = createTestHandlerApp(
  listComments,
  createComment,
  resolveCommentThread,
);

/** A minimal valid TipTap document. */
function body(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

const test = base.extend<{
  user: User;
  account: Account;
  project: Project;
  media: Media;
  token: string;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await factory.UserAccount.create({ userId: user.id });
    await use(user);
  },
  account: async ({ user }, use) => {
    const account = await factory.TeamAccount.create({ slug: "acme" });
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await use(account);
  },
  project: async ({ account }, use) => {
    await use(await factory.Project.create({ accountId: account.id }));
  },
  media: async ({ project }, use) => {
    const { media } = await factory.createMediaWithVersion({
      media: { projectId: project.id },
    });
    await use(media);
  },
  token: async ({ user, account }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: account.id,
    });
    await use(token);
  },
});

beforeAll(() => {
  z.globalRegistry.clear();
});

describe("media comments", () => {
  test("posts a comment pinned to a point on the image", async ({
    token,
    media,
  }) => {
    // The annotation replacement: a normalized (x, y) survives any scaling, so
    // the pin lands in the same place whatever size the image is rendered at.
    const res = await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        body: body("This button is misaligned"),
        anchor: { type: "point", x: 0.42, y: 0.71 },
      })
      .expect(201);

    expect(res.body.anchor).toEqual({ type: "point", x: 0.42, y: 0.71 });

    const stored = await Comment.query().findOne({ mediaId: media.id });
    expect(stored).toBeDefined();
    // The build-only columns stay null — the database constraint enforces it.
    expect(stored?.buildId).toBeNull();
    expect(stored?.screenshotDiffId).toBeNull();
  });

  test("posts a comment about the whole media", async ({ token, media }) => {
    const res = await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: body("Looks good overall") })
      .expect(201);

    expect(res.body.anchor).toBeNull();
  });

  test("rejects a line-range anchor, which has no meaning on an image", async ({
    token,
    media,
  }) => {
    const res = await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        body: body("nope"),
        anchor: { type: "lines", from: 1, to: 4 },
      })
      .expect(400);

    expect(res.body.error).toContain("anchored to a point");
  });

  test("rejects coordinates outside the image", async ({ token, media }) => {
    await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        body: body("nope"),
        anchor: { type: "point", x: 1.5, y: 0.5 },
      })
      .expect(400);
  });

  test("refuses an anchor on a reply, which inherits its thread's", async ({
    token,
    media,
  }) => {
    const root = await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        body: body("root"),
        anchor: { type: "point", x: 0.1, y: 0.1 },
      })
      .expect(201);

    const res = await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        body: body("reply"),
        threadId: root.body.id,
        anchor: { type: "point", x: 0.9, y: 0.9 },
      })
      .expect(400);

    expect(res.body.error).toContain("reply cannot carry its own anchor");
  });

  test("lists the comments on a media", async ({ token, media }) => {
    await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: body("first") })
      .expect(201);
    await request(app)
      .post(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: body("second") })
      .expect(201);

    const res = await request(app)
      .get(`/media/${media.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].text).toContain("first");
  });

  test("404s on a media in a project the token cannot reach", async ({
    token,
  }) => {
    const otherAccount = await factory.TeamAccount.create({ slug: "other" });
    const otherProject = await factory.Project.create({
      accountId: otherAccount.id,
    });
    const { media: otherMedia } = await factory.createMediaWithVersion({
      media: { projectId: otherProject.id },
    });

    await request(app)
      .get(`/media/${otherMedia.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });
});
