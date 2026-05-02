import type { IncomingHttpHeaders } from "node:http";
import { invariant } from "@argos/util/invariant";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, test as base, describe, expect } from "vitest";

import { createJWT, JWT_VERSION } from "@/auth/jwt";
import config from "@/config";
import type { Account, Deployment } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import router from "./deployment-access";
import { createTestApp } from "./test-util";

const app = createTestApp(router);

const getRedirectLocation = (headers: IncomingHttpHeaders) => {
  const location = headers["location"];
  invariant(typeof location === "string", "Redirect location is missing");
  return new URL(location);
};

const createSessionCookie = (account: Account) => {
  const token = createJWT({
    version: JWT_VERSION,
    account: {
      id: account.id,
      slug: account.slug,
      name: account.name,
    },
  });
  return `theme=dark; argos_jwt=${token}; other=value`;
};

const test = base.extend<{
  deployment: Deployment;
  userAccount: Account;
}>({
  userAccount: async ({}, use) => {
    await setupDatabase();
    const userAccount = await factory.UserAccount.create();
    await use(userAccount);
  },
  deployment: async ({ userAccount }, use) => {
    const project = await factory.Project.create({
      accountId: userAccount.id,
      private: true,
    });
    const deployment = await factory.Deployment.create({
      projectId: project.id,
      environment: "preview",
    });
    await factory.DeploymentAlias.create({
      deploymentId: deployment.id,
      alias: "preview-access",
    });
    await use(deployment);
  },
});

describe("deployment access web auth", () => {
  const originalSecret = config.get("deployments.accessTokenSecret");

  afterEach(() => {
    config.set("deployments.accessTokenSecret", originalSecret);
  });

  test("redirects authenticated viewers back to the deployment with an access token", async ({
    deployment,
    userAccount,
  }) => {
    config.set("deployments.accessTokenSecret", "deployment-access-secret");

    await request(app)
      .get("/auth/deployments")
      .query({
        return_to:
          "https://preview-access.dev.argos-ci.live/dashboard?tab=logs#details",
      })
      .set("Cookie", createSessionCookie(userAccount))
      .expect(302)
      .expect((res) => {
        expect(res.headers["cache-control"]).toBe("no-store");

        const location = getRedirectLocation(res.headers);
        expect(location.origin).toBe(
          "https://preview-access.dev.argos-ci.live",
        );
        expect(location.pathname).toBe("/__argos/auth");
        expect(location.searchParams.get("return_to")).toBe(
          "/dashboard?tab=logs#details",
        );

        const token = location.searchParams.get("token");
        invariant(typeof token === "string", "Access token is missing");
        const payload = jwt.verify(token, "deployment-access-secret", {
          algorithms: ["HS256"],
        });
        invariant(typeof payload === "object", "JWT payload is missing");
        expect(payload).toMatchObject({
          projectId: deployment.projectId,
          sub: userAccount.userId,
        });
      });
  });

  test("redirects anonymous requests to login with the current request as return target", async () => {
    await request(app)
      .get("/auth/deployments")
      .query({
        return_to: "https://preview-access.dev.argos-ci.live/dashboard",
      })
      .expect(302)
      .expect((res) => {
        const location = getRedirectLocation(res.headers);
        expect(location.origin).toBe(config.get("server.url"));
        expect(location.pathname).toBe("/login");

        const returnTarget = location.searchParams.get("r");
        invariant(typeof returnTarget === "string", "Login return URL missing");
        const returnUrl = new URL(returnTarget);
        expect(returnUrl.pathname).toBe("/auth/deployments");
        expect(returnUrl.searchParams.get("return_to")).toBe(
          "https://preview-access.dev.argos-ci.live/dashboard",
        );
      });
  });

  test("rejects return targets outside the deployments base domain", async () => {
    await request(app)
      .get("/auth/deployments")
      .query({
        return_to: "https://example.com/dashboard",
      })
      .expect(400)
      .expect((res) => {
        expect(res.text).toBe("Invalid return_to");
      });
  });

  test("rejects authenticated users without project view permission", async ({
    deployment,
  }) => {
    config.set("deployments.accessTokenSecret", "deployment-access-secret");
    const otherAccount = await factory.UserAccount.create();

    await request(app)
      .get("/auth/deployments")
      .query({
        return_to: `https://${deployment.slug}.dev.argos-ci.live/dashboard`,
      })
      .set("Cookie", createSessionCookie(otherAccount))
      .expect(403)
      .expect((res) => {
        expect(res.text).toBe("You do not have access to this deployment");
      });
  });
});
