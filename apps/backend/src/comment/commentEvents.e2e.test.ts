import { test as base, beforeEach, describe, expect, vi } from "vitest";

import { Build } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { redisPubSub } from "@/util/redis";

import { publishCommentChange } from "./commentEvents";

vi.spyOn(redisPubSub, "publish").mockResolvedValue(undefined);
const mockPublish = vi.mocked(redisPubSub.publish);

type Fixtures = { build: Build };

const test = base.extend<Fixtures>({
  build: async ({}, use) => {
    await setupDatabase();
    const build = await factory.Build.create();
    await use(build);
  },
});

function content(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("publishCommentChange", () => {
  beforeEach(() => {
    mockPublish.mockClear();
  });

  test("does not broadcast a comment that belongs to a pending review", async ({
    build,
  }) => {
    const review = await factory.BuildReview.create({
      buildId: build.id,
      state: "pending",
    });
    const comment = await factory.Comment.create({
      buildId: build.id,
      buildReviewId: review.id,
      content: content("draft"),
    });
    await publishCommentChange({ buildId: build.id, type: "UPDATED", comment });
    expect(mockPublish).not.toHaveBeenCalled();
  });

  test("broadcasts a standalone comment", async ({ build }) => {
    const comment = await factory.Comment.create({
      buildId: build.id,
      content: content("live"),
    });
    await publishCommentChange({ buildId: build.id, type: "UPDATED", comment });
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });

  test("broadcasts a comment once its review is submitted", async ({
    build,
  }) => {
    const review = await factory.BuildReview.create({
      buildId: build.id,
      state: "commented",
    });
    const comment = await factory.Comment.create({
      buildId: build.id,
      buildReviewId: review.id,
      content: content("now live"),
    });
    await publishCommentChange({ buildId: build.id, type: "ADDED", comment });
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });
});
