import { randomBytes } from "node:crypto";
import { FactoryGirl, ModelAdapter } from "factory-girl-ts";
import moment from "moment";
import type { Model, ModelClass, PartialModelObject } from "objection";

import * as models from "../models/index.js";

class ObjectionAdapter<TEntity extends Model, T extends ModelClass<TEntity>>
  implements ModelAdapter<T, Model>
{
  get<K extends keyof Model>(model: Model, key: K): Model[K] {
    return model[key];
  }

  build(ModelClass: T, props: PartialModelObject<TEntity>): TEntity {
    return ModelClass.fromJson(props);
  }

  async save(model: Model, ModelClass: T): Promise<Model> {
    const saved = await ModelClass.query().insertAndFetch(model.toJSON());
    return saved;
  }
}

FactoryGirl.setAdapter(new ObjectionAdapter());

// Taken from uuid/bytesToUuid.js
const bytesToString = (bytes: Buffer) => {
  let output = "";
  for (let i = 0; i < bytes.length; i += 1) {
    output += (bytes[i]! + 0x100).toString(16).substr(1);
  }
  return output;
};

const defineFactory = <
  TModel extends Model,
  TModelClass extends ModelClass<TModel>,
>(
  modelClass: TModelClass,
  definition: () => PartialModelObject<TModel>,
) => {
  const factory = FactoryGirl.define<TModelClass, PartialModelObject<TModel>>(
    modelClass,
    definition,
  );
  return factory;
};

export const Team = defineFactory(models.Team, () => ({
  defaultUserLevel: "member",
}));

export const User = defineFactory(models.User, () => ({
  email: FactoryGirl.sequence("user.email", (n) => `user-${n}@email.com`),
}));

export const GithubAccount = defineFactory(models.GithubAccount, () => ({
  login: FactoryGirl.sequence("githubAccount.login", (n) => `login-${n}`),
  githubId: FactoryGirl.sequence("githubAccount.githubId", (n) => n),
  type: "user",
}));

export const GithubRepository = defineFactory(models.GithubRepository, () => ({
  name: FactoryGirl.sequence("githubRepository.name", (n) => `repo-${n}`),
  private: true,
  defaultBranch: "main",
  githubId: FactoryGirl.sequence("githubRepository.githubId", (n) => n),
  githubAccountId: GithubAccount.associate("id"),
}));

export const UserAccount = defineFactory(models.Account, () => ({
  userId: User.associate("id"),
  name: FactoryGirl.sequence("account.slug", (n) => `Account ${n}`),
  slug: FactoryGirl.sequence("account.slug", (n) => `account-${n}`),
  githubAccountId: GithubAccount.extend(() => ({ type: "user" })).associate(
    "id",
  ),
}));

export const Subscription = defineFactory(models.Subscription, () => ({
  planId: Plan.associate("id"),
  accountId: UserAccount.associate("id"),
  startDate: moment().startOf("day").subtract(2, "months").toISOString(),
  endDate: null,
  provider: "github",
  paymentMethodFilled: false,
  status: "active",
}));

export const TeamAccount = defineFactory(models.Account, () => ({
  teamId: Team.associate("id"),
  name: FactoryGirl.sequence("account.slug", (n) => `Account ${n}`),
  slug: FactoryGirl.sequence("account.slug", (n) => `account-${n}`),
  githubAccountId: GithubAccount.extend(() => ({
    type: "organization",
  })).associate("id"),
}));

export const Project = defineFactory(models.Project, () => ({
  name: "awesome-project",
  accountId: TeamAccount.associate("id"),
  githubRepositoryId: GithubRepository.associate("id"),
}));

export const ScreenshotBucket = defineFactory(models.ScreenshotBucket, () => ({
  name: "default",
  commit: bytesToString(randomBytes(20)),
  branch: "master",
  projectId: Project.associate("id"),
  screenshotCount: 0,
  storybookScreenshotCount: 0,
  complete: true,
  valid: true,
}));

export const Build = defineFactory(models.Build, () => {
  const projectId = Project.associate("id");
  return {
    createdAt: new Date().toISOString(),
    jobStatus: "complete",
    projectId,
    compareScreenshotBucketId: ScreenshotBucket.extend(() => ({
      projectId,
    })).associate("id"),
    conclusion: "no-changes",
    stats: {
      failure: 0,
      added: 0,
      unchanged: 0,
      changed: 0,
      removed: 0,
      total: 0,
      retryFailure: 0,
    },
  };
});

export const BuildNotification = defineFactory(
  models.BuildNotification,
  () => ({
    buildId: Build.associate("id"),
    jobStatus: "complete",
    type: "no-diff-detected",
  }),
);

export const TeamUser = defineFactory(models.TeamUser, () => ({
  userId: User.associate("id"),
  teamId: Team.associate("id"),
  userLevel: "owner",
}));

export const ScreenshotDiff = defineFactory(models.ScreenshotDiff, () => ({
  buildId: Build.associate("id"),
  baseScreenshotId: Screenshot.associate("id"),
  compareScreenshotId: Screenshot.associate("id"),
  jobStatus: "complete",
  score: 0,
}));

export const BuildReview = defineFactory(models.BuildReview, () => ({
  buildId: Build.associate("id"),
  userId: User.associate("id"),
  state: "accepted",
}));

export const Test = defineFactory(models.Test, () => ({
  name: "test",
  projectId: Project.associate("id"),
  buildName: "default",
}));

export const Screenshot = defineFactory(models.Screenshot, () => ({
  name: FactoryGirl.sequence("repository.name", (n) => `screen-${n}`),
  s3Id: "test-s3-id",
  screenshotBucketId: ScreenshotBucket.associate("id"),
  testId: Test.associate("id"),
}));

export const File = defineFactory(models.File, () => ({
  key: FactoryGirl.sequence("file.key", (n) => `key-${n}`),
  width: 10,
  height: 10,
}));

export const Plan = defineFactory(models.Plan, () => ({
  name: "pro",
  includedScreenshots: 7000,
  githubPlanId: FactoryGirl.sequence("plan.githubId", (n) => n),
  usageBased: false,
  githubSsoIncluded: true,
  fineGrainedAccessControlIncluded: true,
  interval: "month",
}));

export const SlackInstallation = defineFactory(
  models.SlackInstallation,
  () => ({
    connectedAt: new Date().toISOString(),
    teamId: FactoryGirl.sequence(
      "slackInstallation.teamId",
      (n) => `team-${n}`,
    ),
    teamDomain: FactoryGirl.sequence(
      "slackInstallation.teamDomain",
      (n) => `teamDomain-${n}`,
    ),
    teamName: FactoryGirl.sequence(
      "slackInstallation.teamName",
      (n) => `teamName-${n}`,
    ),
    installation: {
      bot: {
        botUserId: "botUserId",
        botAccessToken: "botAccessToken",
        botScopes: ["chat:write"],
      },
    },
  }),
);
export const SlackChannel = defineFactory(models.SlackChannel, () => ({
  slackId: FactoryGirl.sequence("slackChannel.slackId", (n) => `slack-${n}`),
  name: FactoryGirl.sequence("slackChannel.name", (n) => `channel-${n}`),
  slackInstallationId: SlackInstallation.associate("id"),
}));

export const AutomationRule = defineFactory(models.AutomationRule, () => ({
  active: true,
  name: FactoryGirl.sequence("automationRule.name", (n) => `rule-${n}`),
  projectId: Project.associate("id"),
  on: ["build.completed"],
  if: {
    all: [],
  },
  then: [
    {
      action: "sendSlackMessage",
      actionPayload: { channelId: "1234" },
    },
  ],
}));

export const AutomationActionRun = defineFactory(
  models.AutomationActionRun,
  () => ({
    jobStatus: "pending",
    conclusion: null,
    failureReason: null,
    automationRunId: AutomationRun.associate("id"),
    action: "sendSlackMessage",
    actionPayload: {
      channelId: "1234",
    },
    processedAt: null,
    completedAt: null,
  }),
);

export const AutomationRun = defineFactory(models.AutomationRun, () => ({
  automationRuleId: AutomationRule.associate("id"),
  event: "build.completed",
  buildId: Build.associate("id"),
  jobStatus: "pending",
}));

export const PullRequest = defineFactory(models.GithubPullRequest, () => ({
  number: 99,
  title: "Fix bug",
  state: "open",
  merged: false,
  mergedAt: null,
  closedAt: null,
  draft: false,
  jobStatus: "complete",
  date: new Date().toISOString(),
  githubRepositoryId: GithubRepository.associate("id"),
}));
