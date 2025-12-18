import type { DocumentNode } from "graphql";

import * as Account from "./Account";
import * as AccountSubscription from "./AccountSubscription";
import * as AutomationRule from "./AutomationRule";
import * as Build from "./Build";
import * as BuildReview from "./BuildReview";
import * as Connection from "./Connection";
import * as DateDefs from "./Date";
import * as GhApiInstallation from "./GhApiInstallation";
import * as GhApiRepository from "./GhApiRepository";
import * as GithubAccount from "./GithubAccount";
import * as GithubInstallation from "./GithubInstallation";
import * as GithubPullRequest from "./GithubPullRequest";
import * as GithubRepository from "./GithubRepository";
import * as GitlabProject from "./GitlabProject";
import * as GitlabUser from "./GitlabUser";
import * as GlApiNamespace from "./GlApiNamespace";
import * as GlApiProject from "./GlApiProject";
import * as GoogleUser from "./GoogleUser";
import * as JobStatus from "./JobStatus";
import * as MetricsPeriod from "./MetricsPeriod";
import * as Node from "./Node";
import * as PageInfo from "./PageInfo";
import * as Plan from "./Plan";
import * as Project from "./Project";
import * as PullRequest from "./PullRequest";
import * as Repository from "./Repository";
import * as schema from "./schema";
import * as Screenshot from "./Screenshot";
import * as ScreenshotBucket from "./ScreenshotBucket";
import * as ScreenshotDiff from "./ScreenshotDiff";
import * as SlackInstallation from "./SlackInstallation";
import * as Team from "./Team";
import * as Test from "./Test";
import * as TimeSeries from "./TimeSeries";
import * as User from "./User";
import * as ValidationStatus from "./ValidationStatus";

export const definitions: { resolvers?: object; typeDefs?: DocumentNode }[] = [
  Account,
  AccountSubscription,
  AutomationRule,
  Build,
  BuildReview,
  Connection,
  DateDefs,
  GhApiInstallation,
  GhApiRepository,
  GithubAccount,
  GithubInstallation,
  GithubPullRequest,
  GithubRepository,
  GitlabProject,
  GitlabUser,
  GlApiNamespace,
  GlApiProject,
  GoogleUser,
  JobStatus,
  MetricsPeriod,
  Node,
  PageInfo,
  Plan,
  Project,
  PullRequest,
  Repository,
  schema,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  SlackInstallation,
  Team,
  Test,
  TimeSeries,
  User,
  ValidationStatus,
];
