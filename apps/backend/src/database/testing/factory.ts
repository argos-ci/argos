import { randomBytes } from "node:crypto";
import type * as Bolt from "@slack/bolt";
import { FactoryGirl, ModelAdapter } from "factory-girl-ts";
import moment from "moment";
import type { Model, ModelClass, PartialModelObject } from "objection";

import * as models from "../models/index.js";

class ObjectionAdapter<
  TEntity extends Model,
  T extends ModelClass<TEntity>,
> implements ModelAdapter<T, Model> {
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

export function defineFactory<C extends ModelClass<any>>(
  modelClass: C,
  definition: () => PartialModelObject<InstanceType<C>>,
) {
  return FactoryGirl.define<
    C,
    PartialModelObject<InstanceType<C>>,
    any,
    // @ts-expect-error probably a typing issue in factory
    InstanceType<C>
  >(modelClass, definition);
}

export const Team = defineFactory(models.Team, () => ({
  defaultUserLevel: "member" as const,
}));

export const User = defineFactory(models.User, () => ({
  email: FactoryGirl.sequence("user.email", (n) => `user-${n}@email.com`),
}));

export const GithubAccount = defineFactory(models.GithubAccount, () => ({
  login: FactoryGirl.sequence("githubAccount.login", (n) => `login-${n}`),
  githubId: FactoryGirl.sequence("githubAccount.githubId", (n) => n),
  type: "user" as const,
}));

export const GithubRepository = defineFactory(models.GithubRepository, () => ({
  name: FactoryGirl.sequence("githubRepository.name", (n) => `repo-${n}`),
  private: true,
  defaultBranch: "main",
  githubId: FactoryGirl.sequence("githubRepository.githubId", (n) => n),
  githubAccountId: GithubAccount.associate("id") as unknown as string,
}));

export const UserAccount = defineFactory(models.Account, () => ({
  userId: User.associate("id") as unknown as string,
  name: FactoryGirl.sequence("account.slug", (n) => `Account ${n}`),
  slug: FactoryGirl.sequence("account.slug", (n) => `account-${n}`),
  githubAccountId: GithubAccount.extend(() => ({ type: "user" })).associate(
    "id",
  ) as unknown as string,
}));

export const Subscription = defineFactory(models.Subscription, () => ({
  planId: Plan.associate("id") as unknown as string,
  accountId: UserAccount.associate("id") as unknown as string,
  startDate: moment().startOf("day").subtract(2, "months").toISOString(),
  endDate: null,
  provider: "github" as const,
  paymentMethodFilled: false,
  status: "active" as const,
}));

export const TeamAccount = defineFactory(models.Account, () => ({
  teamId: Team.associate("id") as unknown as string,
  name: FactoryGirl.sequence("account.slug", (n) => `Account ${n}`),
  slug: FactoryGirl.sequence("account.slug", (n) => `account-${n}`),
  githubAccountId: GithubAccount.extend(() => ({
    type: "organization",
  })).associate("id") as unknown as string,
}));

export const Project = defineFactory(models.Project, () => ({
  name: "awesome-project",
  accountId: TeamAccount.associate("id") as unknown as string,
  githubRepositoryId: GithubRepository.associate("id") as unknown as string,
}));

export const ScreenshotBucket = defineFactory(models.ScreenshotBucket, () => ({
  name: "default",
  commit: bytesToString(randomBytes(20)),
  branch: "master",
  projectId: Project.associate("id") as unknown as string,
  screenshotCount: 0,
  storybookScreenshotCount: 0,
  complete: true,
  valid: true,
}));

export const Build = defineFactory(models.Build, () => {
  const projectId = Project.associate("id") as unknown as string;
  return {
    createdAt: new Date().toISOString(),
    jobStatus: "complete" as const,
    projectId,
    compareScreenshotBucketId: ScreenshotBucket.extend(() => ({
      projectId,
    })).associate("id") as unknown as string,
    conclusion: "no-changes" as const,
    stats: {
      failure: 0,
      added: 0,
      unchanged: 0,
      changed: 0,
      removed: 0,
      total: 0,
      retryFailure: 0,
      ignored: 0,
    },
  };
});

export const BuildNotification = defineFactory(
  models.BuildNotification,
  () => ({
    buildId: Build.associate("id") as unknown as string,
    jobStatus: "complete" as const,
    type: "no-diff-detected" as const,
  }),
);

export const TeamUser = defineFactory(models.TeamUser, () => ({
  userId: User.associate("id") as unknown as string,
  teamId: Team.associate("id") as unknown as string,
  userLevel: "owner" as const,
}));

export const ScreenshotDiff = defineFactory(models.ScreenshotDiff, () => ({
  buildId: Build.associate("id") as unknown as string,
  baseScreenshotId: Screenshot.associate("id") as unknown as string,
  compareScreenshotId: Screenshot.associate("id") as unknown as string,
  jobStatus: "complete" as const,
  score: 0,
}));

export const BuildReview = defineFactory(models.BuildReview, () => ({
  buildId: Build.associate("id") as unknown as string,
  userId: User.associate("id") as unknown as string,
  state: "approved" as const,
}));

export const ScreenshotDiffReview = defineFactory(
  models.ScreenshotDiffReview,
  () => ({
    buildReviewId: BuildReview.associate("id") as unknown as string,
    screenshotDiffId: ScreenshotDiff.associate("id") as unknown as string,
    state: "approved" as const,
  }),
);

export const Test = defineFactory(models.Test, () => ({
  name: "test",
  projectId: Project.associate("id") as unknown as string,
  buildName: "default",
}));

export const Screenshot = defineFactory(models.Screenshot, () => ({
  name: FactoryGirl.sequence("repository.name", (n) => `screen-${n}`),
  s3Id: "test-s3-id",
  screenshotBucketId: ScreenshotBucket.associate("id") as unknown as string,
  testId: Test.associate("id") as unknown as string,
}));

export const File = defineFactory(models.File, () => ({
  key: FactoryGirl.sequence("file.key", (n) => `key-${n}`),
  width: 10,
  height: 10,
  contentType: "image/png",
}));

export const Plan = defineFactory(models.Plan, () => ({
  name: "pro",
  includedScreenshots: 7000,
  githubPlanId: FactoryGirl.sequence("plan.githubId", (n) => n),
  usageBased: false,
  githubSsoIncluded: true,
  fineGrainedAccessControlIncluded: true,
  interval: "month" as const,
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
    } as unknown as Bolt.Installation,
  }),
);
export const SlackChannel = defineFactory(models.SlackChannel, () => ({
  slackId: FactoryGirl.sequence("slackChannel.slackId", (n) => `slack-${n}`),
  name: FactoryGirl.sequence("slackChannel.name", (n) => `channel-${n}`),
  slackInstallationId: SlackInstallation.associate("id") as unknown as string,
}));

export const AutomationRule = defineFactory(models.AutomationRule, () => ({
  active: true,
  name: FactoryGirl.sequence("automationRule.name", (n) => `rule-${n}`),
  projectId: Project.associate("id") as unknown as string,
  on: ["build.completed" as const],
  if: {
    all: [],
  },
  then: [
    {
      action: "sendSlackMessage" as const,
      actionPayload: { channelId: "1234" },
    },
  ],
}));

export const AutomationActionRun = defineFactory(
  models.AutomationActionRun,
  () => ({
    jobStatus: "pending" as const,
    conclusion: null,
    failureReason: null,
    automationRunId: AutomationRun.associate("id") as unknown as string,
    action: "sendSlackMessage" as const,
    actionPayload: {
      channelId: "1234",
    },
    processedAt: null,
    completedAt: null,
  }),
);

export const AutomationRun = defineFactory(models.AutomationRun, () => ({
  automationRuleId: AutomationRule.associate("id") as unknown as string,
  event: "build.completed" as const,
  buildId: Build.associate("id") as unknown as string,
}));

export const PullRequest = defineFactory(models.GithubPullRequest, () => ({
  number: 99,
  title: "Fix bug",
  state: "open" as const,
  merged: false,
  mergedAt: null,
  closedAt: null,
  draft: false,
  jobStatus: "complete" as const,
  date: new Date().toISOString(),
  githubRepositoryId: GithubRepository.associate("id") as unknown as string,
}));
