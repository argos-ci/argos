import request from "supertest";
import { repoAuth } from "./repoAuth";
import { useDatabase, factory } from "@argos-ci/database/testing";
import { createTestApp } from "../test-util";

const getTomorrowDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date;
};

const app = createTestApp(repoAuth, (req, res) => {
  res.send({ authRepository: req.authRepository });
});

describe("repoAuth", () => {
  let plans;
  useDatabase();

  beforeEach(async () => {
    plans = await factory.createMany("Plan", [
      { name: "free", screenshotsLimitPerMonth: 5 },
      { name: "standard", screenshotsLimitPerMonth: 10 },
      { name: "pro", screenshotsLimitPerMonth: 100 },
    ]);
  });

  describe("for public repository", () => {
    let repository;

    beforeEach(async () => {
      repository = await factory.create("Repository", {
        name: "foo",
        token: "the-awesome-token",
      });
    });

    it("returns 401 without a valid token", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer invalid-token")
        .expect((res) => {
          expect(res.text).toBe(
            `Repository not found (token: "invalid-token")`
          );
        })
        .expect(401);
    });

    // eslint-disable-next-line jest/expect-expect
    it("puts authRepository in req with a valid token", async () => {
      await request(app)
        .get("/")
        .set("Authorization", "Bearer the-awesome-token")
        .expect((res) => {
          expect(res.body.authRepository.id).toBe(repository.id);
        })
        .expect(200);
    });
  });

  describe("for private repository", () => {
    let organization;
    let repository;
    let screenshotBucket;
    let account;

    beforeEach(async () => {
      organization = await factory.create("Organization");
      account = await factory.create("OrganizationAccount", {
        organizationId: organization.id,
      });
      repository = await factory.create("Repository", {
        name: "foo",
        token: "the-awesome-token",
        private: true,
        organizationId: organization.id,
      });
      screenshotBucket = await factory.create("ScreenshotBucket", {
        repositoryId: repository.id,
      });
    });

    describe("without plan", () => {
      // eslint-disable-next-line jest/expect-expect
      it("puts authRepository in req when account has credit", async () => {
        await request(app)
          .get("/")
          .set("Authorization", "Bearer the-awesome-token")
          .expect(200);
      });

      it("returns 402 when account exceed the free plan", async () => {
        await factory.createMany("Screenshot", 10, {
          screenshotBucketId: screenshotBucket.id,
        });

        await request(app)
          .get("/")
          .set("Authorization", "Bearer the-awesome-token")
          .expect((res) => {
            expect(res.text).toBe(
              `Build refused for insufficient credit. Thank to upgrade Argos plan`
            );
          })
          .expect(402);
      });
    });

    describe("with plan", () => {
      beforeEach(async () => {
        await factory.createMany("Purchase", [
          {
            planId: plans[1].id,
            accountId: account.id,
            endDate: getTomorrowDate(),
          },
          {
            planId: plans[2].id,
            accountId: account.id,
            startDate: getTomorrowDate(),
          },
        ]);
      });

      it("puts authRepository in req when account has credits", async () => {
        await request(app)
          .get("/")
          .set("Authorization", "Bearer the-awesome-token")
          .expect((res) => {
            expect(res.body.authRepository.id).toBe(repository.id);
          })
          .expect(200);
      });

      it("puts authRepository in req when the account hit 100% of plan", async () => {
        await factory.createMany("Screenshot", 10, {
          screenshotBucketId: screenshotBucket.id,
        });

        await request(app)
          .get("/")
          .set("Authorization", "Bearer the-awesome-token")
          .expect((res) => {
            expect(res.body.authRepository.id).toBe(repository.id);
          })
          .expect(200);
      });

      it("returns 402 when the account hit 110% of plan", async () => {
        await factory.createMany("Screenshot", 11, {
          screenshotBucketId: screenshotBucket.id,
        });

        await request(app)
          .get("/")
          .set("Authorization", "Bearer the-awesome-token")
          .expect((res) => {
            expect(res.text).toBe(
              `Build refused for insufficient credit. Thank to upgrade Argos plan`
            );
          })
          .expect(402);
      });

      it("puts authRepository in req when account has infinite credits", async () => {
        const account = await factory.create("UserAccount");
        const plan = await factory.create("Plan", {
          screenshotsLimitPerMonth: -1,
        });
        await factory.create("Purchase", {
          planId: plan.id,
          accountId: account.id,
        });

        await request(app)
          .get("/")
          .set("Authorization", "Bearer the-awesome-token")
          .expect((res) => {
            expect(res.body.authRepository.id).toBe(repository.id);
          })
          .expect(200);
      });
    });
  });
});
