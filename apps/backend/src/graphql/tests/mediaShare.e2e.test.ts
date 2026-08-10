import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import type { Account, User } from "@/database/models";
import { Comment, Project } from "@/database/models";
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
      pullRequest {
        id
        number
        title
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

  it("hides a team media from an anonymous visitor even on a public project", async () => {
    // The exact leak this guards against: a public project hands anyone "view"
    // on the project itself, which must not open its team-only media — "team"
    // means members, not whoever may browse the project.
    const account = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: account.id,
      private: false,
    });
    const media = await createMediaScenario({ projectId: project.id });

    const [teamRes, publicRes] = await Promise.all([
      query({ auth: null, shareToken: media.after.shareToken }),
      query({ auth: null, shareToken: media.video.shareToken }),
    ]);

    expectNoGraphQLError(teamRes);
    expect(teamRes.body.data.mediaByShareToken).toBeNull();

    // Only the team-only visibility narrows: the public media on the very same
    // project keeps answering.
    expectNoGraphQLError(publicRes);
    expect(publicRes.body.data.mediaByShareToken).not.toBeNull();
  });

  it("hides a public project's team media from a signed-in outsider", async () => {
    const outsider = await factory.User.create();
    const outsiderAccount = await factory.UserAccount.create({
      userId: outsider.id,
    });
    const account = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: account.id,
      private: false,
    });
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

  it("pairs a staged media only within its own branch", async () => {
    // Identity is (project, attachment, name, state), and for staged media the
    // attachment is the branch. Keying the pairing on the pull request alone
    // collapses every staged media onto one empty segment, so two branches
    // staging `checkout.png` pair across each other — and which one wins depends
    // on the order the candidate query happened to return.
    const { auth, project } = await createTeamOwner();

    const { media: mine } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        state: "before",
        branch: "feat/a",
        shareToken: "pair-mine",
      },
    });
    const { media: sibling } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        state: "after",
        branch: "feat/a",
        shareToken: "pair-sibling",
      },
    });
    // Same name and the same opposite state, on another branch.
    await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        state: "after",
        branch: "feat/b",
        shareToken: "pair-other-branch",
      },
    });

    const res = await query({ auth, shareToken: mine.shareToken });

    expectNoGraphQLError(res);
    expect(res.body.data.mediaByShareToken.counterpart.id).toBe(sibling.id);
  });

  it("hides a team-only counterpart from a public share link", async () => {
    // A pair is two uploads, each carrying its own visibility, so a mixed pair
    // is ordinary — and on a paid plan `team` is the default. Returning the
    // counterpart unchecked handed an anonymous visitor the team half in full:
    // its share token, its review threads, and a `fileUrl` that is the bytes.
    const { project } = await createTeamOwner();

    const { media: shared } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        state: "after",
        branch: "feat/mixed",
        visibility: "public",
        shareToken: "mixed-public-half",
      },
    });
    await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        state: "before",
        branch: "feat/mixed",
        visibility: "team",
        shareToken: "mixed-team-half",
      },
    });

    // No session at all: the reviewer a public link exists for.
    const res = await query({ auth: null, shareToken: shared.shareToken });

    expectNoGraphQLError(res);
    const result = res.body.data.mediaByShareToken;
    expect(result.id).toBe(shared.id);
    expect(result.counterpart).toBeNull();
    // The pair snippet embeds the counterpart's share URL, so it has to go too.
    expect(result.markdownPair).toBeNull();
  });

  it("still shows a counterpart the viewer may see", async () => {
    const { auth, project } = await createTeamOwner();
    const { media: shared } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        state: "after",
        branch: "feat/team",
        visibility: "team",
        shareToken: "team-both-after",
      },
    });
    const { media: other } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        name: "checkout.png",
        state: "before",
        branch: "feat/team",
        visibility: "team",
        shareToken: "team-both-before",
      },
    });

    const res = await query({ auth, shareToken: shared.shareToken });

    expectNoGraphQLError(res);
    expect(res.body.data.mediaByShareToken.counterpart.id).toBe(other.id);
  });

  it("hides the pull request from a viewer outside the project", async () => {
    // A public share link exists so a reviewer can see the *picture*. Which pull
    // request it belongs to, its title and its author are the work around it,
    // and a stranger holding the link is not entitled to that — nor is a signed
    // -in stranger, which is why the gate is project membership rather than
    // "is there a session".
    const { project } = await createTeamOwner();
    const repository = await factory.GithubRepository.create();
    await Project.query().findById(project.id).patch({
      githubRepositoryId: repository.id,
    });
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 4242,
      title: "Tighten the checkout spacing",
    });
    const { media } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        visibility: "public",
        shareToken: "pr-public-half",
        githubPullRequestId: pullRequest.id,
      },
    });

    const anonymous = await query({ auth: null, shareToken: media.shareToken });
    expectNoGraphQLError(anonymous);
    expect(anonymous.body.data.mediaByShareToken.id).toBe(media.id);
    expect(anonymous.body.data.mediaByShareToken.pullRequest).toBeNull();

    // Someone with an account, but not on this team.
    const outsider = await factory.User.create();
    const outsiderAccount = await factory.UserAccount.create({
      userId: outsider.id,
    });
    const signedIn = await query({
      auth: { user: outsider, account: outsiderAccount },
      shareToken: media.shareToken,
    });
    expectNoGraphQLError(signedIn);
    expect(signedIn.body.data.mediaByShareToken.pullRequest).toBeNull();
  });

  it("shows the pull request to a project member", async () => {
    const { auth, project } = await createTeamOwner();
    const repository = await factory.GithubRepository.create();
    await Project.query().findById(project.id).patch({
      githubRepositoryId: repository.id,
    });
    const pullRequest = await factory.PullRequest.create({
      githubRepositoryId: repository.id,
      number: 77,
      title: "Tighten the checkout spacing",
    });
    const { media } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        shareToken: "pr-member-view",
        githubPullRequestId: pullRequest.id,
      },
    });

    const res = await query({ auth, shareToken: media.shareToken });

    expectNoGraphQLError(res);
    expect(res.body.data.mediaByShareToken.pullRequest).toMatchObject({
      number: 77,
      title: "Tighten the checkout spacing",
    });
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
