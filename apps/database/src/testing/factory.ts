/* eslint-disable import/no-extraneous-dependencies */
import { factory } from "factory-girl";
import moment from "moment";
import { randomBytes } from "node:crypto";
import type { Model, ModelClass, PartialModelObject } from "objection";

import {
  Account,
  Build,
  BuildNotification,
  File,
  GithubAccount,
  GithubSynchronization,
  Plan,
  Project,
  Purchase,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Team,
  TeamUser,
  Test,
  User,
} from "../models/index.js";

class ObjectionAdapter {
  build<TModel extends Model>(Model: ModelClass<TModel>, json: object) {
    return Model.fromJson(json, { skipValidation: true });
  }

  async save<TModel extends Model>(
    insert: PartialModelObject<TModel>,
    Model: ModelClass<TModel>
  ) {
    return Model.query().insertAndFetch(insert);
  }

  async destroy<TModel extends Model>(
    attrs: { id: number },
    Model: ModelClass<TModel>
  ) {
    return Model.query().deleteById(attrs.id);
  }

  get<TModel extends Model>(model: TModel, key: keyof TModel) {
    return model[key];
  }

  set<TModel extends Model>(attrs: PartialModelObject<TModel>, model: TModel) {
    return Object.assign(model, attrs);
  }
}

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
  projectId: factory.assoc("Project", "id"),
});

factory.define<Build>(
  "Build",
  Build,
  {
    jobStatus: "complete",
    projectId: factory.assoc("Project", "id"),
  },
  {
    async afterBuild(model: Build) {
      if (!model.compareScreenshotBucketId) {
        const compareScreenshotBucket = await factory.create<ScreenshotBucket>(
          "ScreenshotBucket",
          {
            projectId: model.projectId,
          }
        );
        model.compareScreenshotBucketId = compareScreenshotBucket.id;
      }

      return model;
    },
  }
);

factory.define("GithubAccount", GithubAccount, {
  login: factory.sequence("githubAccount.login", (n) => `login-${n}`),
  githubId: factory.sequence("githubAccount.githubId", (n) => n),
  type: "user",
});

factory.define("BuildNotification", BuildNotification, {
  buildId: factory.assoc("Build", "id"),
  jobStatus: "complete",
  type: "no-diff-detected",
});

factory.define("User", User, {
  email: factory.sequence("user.email", (n) => `user-${n}@email.com`),
});

factory.define("Team", Team, {});

factory.define("Project", Project, {
  name: "Default",
  slug: "default",
  baselineBranch: null,
  accountId: factory.assoc("TeamAccount", "id"),
});

factory.define("TeamUser", TeamUser, {
  userId: factory.assoc("User", "id"),
  teamId: factory.assoc("Team", "id"),
});

factory.define("ScreenshotDiff", ScreenshotDiff, {
  buildId: factory.assoc("Build", "id"),
  baseScreenshotId: factory.assoc("Screenshot", "id"),
  compareScreenshotId: factory.assoc("Screenshot", "id"),
  jobStatus: "complete",
  validationStatus: "accepted",
  score: 0,
});

factory.define("Test", Test, {
  name: factory.chance("animal"),
  projectId: factory.assoc("Project", "id"),
  buildName: "default",
  status: "pending",
});

factory.define("Screenshot", Screenshot, {
  name: factory.sequence("repository.name", (n) => `screen-${n}`),
  s3Id: "test-s3-id",
  screenshotBucketId: factory.assoc("ScreenshotBucket", "id"),
  testId: factory.assoc("Test", "id"),
});

factory.define("File", File, {
  key: factory.sequence("file.key", (n) => `key-${n}`),
  width: 10,
  height: 10,
});

factory.define("GithubSynchronization", GithubSynchronization, {
  installationId: factory.assoc("Installation", "id"),
  jobStatus: "complete",
});

factory.define("Plan", Plan, {
  name: factory.chance("pickone", ["Free", "Standard", "Pro", "Enterprise"]),
  screenshotsLimitPerMonth: factory.chance("pickone", [7000, 5e4, 1e5, 1e7]),
  githubId: factory.sequence("plan.githubId", (n) => n),
});

factory.define("TeamAccount", Account, {
  teamId: factory.assoc("Team", "id"),
  name: factory.sequence("account.slug", (n) => `Account ${n}`),
  slug: factory.sequence("account.slug", (n) => `account-${n}`),
  githubAccountId: factory.assoc("GithubAccount", "id", {
    type: "organization",
  }),
});

factory.define("UserAccount", Account, {
  userId: factory.assoc("User", "id"),
  name: factory.sequence("account.slug", (n) => `Account ${n}`),
  slug: factory.sequence("account.slug", (n) => `account-${n}`),
  githubAccountId: factory.assoc("GithubAccount", "id", { type: "user" }),
});

factory.define("Purchase", Purchase, {
  planId: factory.assoc("User", "id"),
  accountId: factory.assoc("UserAccount", "id"),
  startDate: moment().startOf("day").subtract(2, "months").toISOString(),
  endDate: null,
  source: "github",
});

export { factory };
