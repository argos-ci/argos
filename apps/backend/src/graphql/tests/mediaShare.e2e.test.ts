import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import type { Account, User } from "@/database/models";
import { Comment } from "@/database/models";
import { createMediaScenario } from "@/database/seeds";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

/**
 * The share page's own query, field for field.
 *
 * Kept verbatim rather than trimmed: the page renders every comment through
 * `CommentCard`, whose fragment reaches resolvers that were written when a comment
 * could only belong to a build. A field that throws on a media comment breaks the
 * whole page, and only asking for all of them catches that.
 */
const MEDIA_SHARE_QUERY = `
  query MediaShare($shareToken: String!) {
    mediaByShareToken(shareToken: $shareToken) {
      id
      name
      state
      description
      url
      markdown
      markdownPair
      permissions
      unresolvedCommentCount
      latestVersion {
        id
        number
        fileUrl
        posterUrl
        contentType
        sizeBytes
        width
        height
        isVideo
        expiresAt
      }
      versions {
        id
        number
      }
      counterpart {
        id
        url
        state
        latestVersion {
          id
          fileUrl
        }
      }
      project {
        id
        slug
      }
      comments {
        id
        date
        editedAt
        resolvedAt
        content
        threadId
        threadSubscribed
        pending
        permissions
        anchor {
          __typename
          ... on CommentPointAnchor {
            x
            y
          }
        }
        user {
          id
          slug
          name
          avatar {
            url(size: 64)
            color
            initial
          }
        }
        mentionedUsers {
          id
          slug
        }
        reactions {
          emoji
          count
          reactedByMe
        }
      }
    }
  }
`;

/** The share page's own request: a media by token, as a given viewer or as nobody. */
async function query(input: {
  auth: { user: User; account: Account } | null;
  shareToken: string;
}) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    input.auth,
  );
  return request(app)
    .post("/graphql")
    .send({
      query: MEDIA_SHARE_QUERY,
      variables: { shareToken: input.shareToken },
    });
}

/** A team owner, which is who follows a share link out of a pull request. */
async function createTeamOwner() {
  const user = await factory.User.create();
  const userAccount = await factory.UserAccount.create({ userId: user.id });
  const account = await factory.TeamAccount.create();
  await factory.TeamUser.create({
    teamId: account.teamId,
    userId: user.id,
    userLevel: "owner",
  });
  const project = await factory.Project.create({ accountId: account.id });
  return { user, auth: { user, account: userAccount }, project };
}

describe("mediaByShareToken", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  it("returns a media with its comment threads", async () => {
    const { user, auth, project } = await createTeamOwner();
    const media = await createMediaScenario({
      projectId: project.id,
      commentAuthorId: user.id,
    });

    const res = await query({ auth, shareToken: media.after.shareToken });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);

    const result = res.body.data.mediaByShareToken;
    expect(result.name).toBe("checkout.png");
    expect(result.permissions).toContain("comment");
    // Two roots and one reply.
    expect(result.comments).toHaveLength(3);
    expect(result.unresolvedCommentCount).toBe(2);

    // The share page shows the newest upload, and can list what came before.
    expect(result.latestVersion.number).toBe(2);
    expect(result.versions).toHaveLength(2);

    // The other half of the pair, which is what the viewer compares against.
    expect(result.state).toBe("after");
    expect(result.counterpart.state).toBe("before");
    expect(result.counterpart.latestVersion.fileUrl).toContain("http");

    // The single embed points at this half; the pair snippet is the same
    // side-by-side table the managed pull request comment renders.
    expect(result.markdown).toBe(`![checkout.png](${result.url})`);
    expect(result.markdownPair).toContain("| Name | Before | After |");
    expect(result.markdownPair).toContain(result.url);
    expect(result.markdownPair).toContain(result.counterpart.url);

    const pinned = result.comments.find(
      (comment: { anchor: unknown }) => comment.anchor !== null,
    );
    invariant(pinned, "one comment is pinned to a point");
    expect(pinned.anchor).toEqual({
      __typename: "CommentPointAnchor",
      x: 0.62,
      y: 0.34,
    });
  });

  it("hides a team media from someone outside the team", async () => {
    const outsider = await factory.User.create();
    const outsiderAccount = await factory.UserAccount.create({
      userId: outsider.id,
    });
    const account = await factory.TeamAccount.create();
    const project = await factory.Project.create({ accountId: account.id });
    const media = await createMediaScenario({ projectId: project.id });

    const res = await query({
      auth: { user: outsider, account: outsiderAccount },
      shareToken: media.after.shareToken,
    });

    expectNoGraphQLError(res);
    expect(res.body.data.mediaByShareToken).toBeNull();
  });

  it("serves a public media to an anonymous visitor, without the project", async () => {
    const account = await factory.TeamAccount.create();
    const project = await factory.Project.create({ accountId: account.id });
    const media = await createMediaScenario({ projectId: project.id });

    const res = await query({ auth: null, shareToken: media.video.shareToken });

    expectNoGraphQLError(res);
    const result = res.body.data.mediaByShareToken;
    expect(result.name).toBe("checkout-flow.mp4");
    // A visitor holding a public link is not shown which project it belongs to,
    // and cannot comment on it.
    expect(result.project).toBeNull();
    expect(result.permissions).toEqual(["view"]);
    // Not half of a pair: there is no before/after table to offer.
    expect(result.markdownPair).toBeNull();
    expect(result.comments).toEqual([]);
  });

  it("counts only unresolved threads", async () => {
    const { user, auth, project } = await createTeamOwner();
    const media = await createMediaScenario({
      projectId: project.id,
      commentAuthorId: user.id,
    });

    // Resolve the pinned root: its reply goes with it.
    const pinned = await Comment.query()
      .where("mediaId", media.after.id)
      .whereNotNull("anchor")
      .first();
    invariant(pinned, "the scenario seeds a pinned comment");
    await pinned.$query().patch({ resolvedAt: new Date().toISOString() });

    const res = await query({ auth, shareToken: media.after.shareToken });

    expectNoGraphQLError(res);
    expect(res.body.data.mediaByShareToken.unresolvedCommentCount).toBe(1);
  });
});
