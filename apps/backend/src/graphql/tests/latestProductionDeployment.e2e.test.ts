import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, expect } from "vitest";

import type { Account, User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { formatDeploymentId } from "../services/deployment";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const test = base.extend<{
  teamAccount: Account;
  user: User;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  teamAccount: async ({ user }, use) => {
    const teamAccount = await factory.TeamAccount.create();
    const teamId = teamAccount.teamId;
    invariant(teamId, "Team account should have a team");
    await factory.TeamUser.create({
      teamId,
      userId: user.id,
      userLevel: "owner",
    });
    await use(teamAccount);
  },
});

test("returns latest production deployments for project lists", async ({
  teamAccount,
  user,
}) => {
  const firstProject = await factory.Project.create({
    accountId: teamAccount.id,
    name: "first-project",
  });
  const secondProject = await factory.Project.create({
    accountId: teamAccount.id,
    name: "second-project",
  });
  const previewOnlyProject = await factory.Project.create({
    accountId: teamAccount.id,
    name: "preview-only-project",
  });

  await factory.Deployment.create({
    projectId: firstProject.id,
    environment: "production",
    status: "ready",
    branch: "main",
    createdAt: "2026-04-10T10:00:00.000Z",
    slug: "first-project-older-production",
  });
  const firstProjectLatestDeployment = await factory.Deployment.create({
    projectId: firstProject.id,
    environment: "production",
    status: "pending",
    branch: "release",
    createdAt: "2026-04-11T10:00:00.000Z",
    slug: "first-project-latest-production",
  });
  await factory.Deployment.create({
    projectId: firstProject.id,
    environment: "preview",
    status: "ready",
    branch: "preview",
    createdAt: "2026-04-12T10:00:00.000Z",
    slug: "first-project-latest-preview",
  });
  const secondProjectLatestDeployment = await factory.Deployment.create({
    projectId: secondProject.id,
    environment: "production",
    status: "error",
    branch: "stable",
    createdAt: "2026-04-09T10:00:00.000Z",
    slug: "second-project-latest-production",
  });
  await factory.Deployment.create({
    projectId: previewOnlyProject.id,
    environment: "preview",
    status: "ready",
    branch: "main",
    createdAt: "2026-04-13T10:00:00.000Z",
    slug: "preview-only-project-preview",
  });

  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user,
      account: teamAccount,
    },
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: `{
        account(slug: "${teamAccount.slug}") {
          projects(first: 10, after: 0) {
            edges {
              name
              latestProductionDeployment {
                id
                status
                environment
                branch
                createdAt
              }
            }
          }
        }
      }`,
    });

  expectNoGraphQLError(res);
  expect(res.status).toBe(200);

  const projects = Object.fromEntries(
    res.body.data.account.projects.edges.map(
      (project: {
        name: string;
        latestProductionDeployment: {
          id: string;
          status: string;
          environment: string;
          branch: string;
          createdAt: string;
        } | null;
      }) => [project.name, project.latestProductionDeployment],
    ),
  );

  expect(projects).toMatchObject({
    "first-project": {
      id: formatDeploymentId(firstProjectLatestDeployment.id),
      status: "pending",
      environment: "production",
      branch: "release",
      createdAt: "2026-04-11T10:00:00.000Z",
    },
    "second-project": {
      id: formatDeploymentId(secondProjectLatestDeployment.id),
      status: "error",
      environment: "production",
      branch: "stable",
      createdAt: "2026-04-09T10:00:00.000Z",
    },
    "preview-only-project": null,
  });
});
