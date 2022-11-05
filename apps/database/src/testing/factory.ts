/* eslint-disable import/no-extraneous-dependencies */
import { factory } from "factory-girl";
// @ts-ignore
import ObjectionAdapter from "factory-girl-objection-adapter";
import moment from "moment";
import { randomBytes } from "node:crypto";

import {
  Account,
  Build,
  BuildNotification,
  File,
  Organization,
  Plan,
  Purchase,
  Repository,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Synchronization,
  User,
  UserOrganizationRight,
  UserRepositoryRight,
} from "../models/index.js";

factory.setAdapter(new ObjectionAdapter());

// Taken from uuid/bytesToUuid.js
const bytesToString = (bytes: Buffer) => {
  let output = "";
  for (let i = 0; i < bytes.length; i += 1) {
    output += (bytes[i]! + 0x100).toString(16).substr(1);
  }
  return output;
};

factory.define("ScreenshotBucket", ScreenshotBucket, {
  name: "default",
  commit: () => bytesToString(randomBytes(20)),
  branch: "master",
  repositoryId: factory.assoc("Repository", "id"),
});

factory.define<Build>(
  "Build",
  Build,
  {
    jobStatus: "complete",
    repositoryId: factory.assoc("Repository", "id"),
  },
  {
    async afterBuild(model: Build) {
      if (!model.compareScreenshotBucketId) {
        const compareScreenshotBucket = await factory.create<ScreenshotBucket>(
          "ScreenshotBucket",
          {
            repositoryId: model.repositoryId,
          }
        );
        model.compareScreenshotBucketId = compareScreenshotBucket.id;
      }

      return model;
    },
  }
);

factory.define("BuildNotification", BuildNotification, {
  buildId: factory.assoc("Build", "id"),
  jobStatus: "complete",
  type: "no-diff-detected",
});

factory.define("User", User, {
  githubId: factory.sequence("user.githubId", (n) => n),
  name: factory.chance("name"),
  login: factory.sequence("user.login", (n) => `user-${n}`),
  email: factory.sequence("user.email", (n) => `user-${n}@email.com`),
});

factory.define("Organization", Organization, {
  githubId: factory.sequence("organization.githubId", (n) => n),
  name: factory.sequence("organization.name", (n) => `Orga-${n}`),
  login: factory.sequence("organization.login", (n) => `orga-${n}`),
});

factory.define("Repository", Repository, {
  githubId: factory.sequence("repository.githubId", (n) => n),
  name: "default",
  defaultBranch: "master",
  baselineBranch: null,
  organizationId: factory.assoc("Organization", "id"),
  private: false,
});

factory.define("UserRepositoryRight", UserRepositoryRight, {
  userId: factory.assoc("User", "id"),
  repositoryId: factory.assoc("Repository", "id"),
});

factory.define("UserOrganizationRight", UserOrganizationRight, {
  userId: factory.assoc("User", "id"),
  organizationId: factory.assoc("Organization", "id"),
});

factory.define("ScreenshotDiff", ScreenshotDiff, {
  buildId: factory.assoc("Build", "id"),
  baseScreenshotId: factory.assoc("Screenshot", "id"),
  compareScreenshotId: factory.assoc("Screenshot", "id"),
  jobStatus: "complete",
  validationStatus: "accepted",
  score: 0,
});

factory.define("Screenshot", Screenshot, {
  name: factory.sequence("repository.name", (n) => `screen-${n}`),
  s3Id: "test-s3-id",
  screenshotBucketId: factory.assoc("ScreenshotBucket", "id"),
});

factory.define("File", File, {
  key: factory.sequence("file.key", (n) => `key-${n}`),
  width: 10,
  height: 10,
});

factory.define("Synchronization", Synchronization, {
  userId: factory.assoc("User", "id"),
  jobStatus: "complete",
  type: "github",
});

factory.define("Plan", Plan, {
  name: factory.chance("pickone", ["Free", "Standard", "Pro", "Enterprise"]),
  screenshotsLimitPerMonth: factory.chance("pickone", [7000, 5e4, 1e5, 1e7]),
  githubId: factory.sequence("plan.githubId", (n) => n),
});

factory.define("OrganizationAccount", Account, {
  organizationId: factory.assoc("Organization", "id"),
});

factory.define("UserAccount", Account, {
  userId: factory.assoc("User", "id"),
});

factory.define("Purchase", Purchase, {
  planId: factory.assoc("User", "id"),
  accountId: factory.assoc("UserAccount", "id"),
  startDate: moment().startOf("day").subtract(2, "months").toISOString(),
  endDate: null,
});

export { factory };
