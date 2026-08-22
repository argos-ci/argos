import type { DocumentNode } from "graphql";

import * as Account from "./Account";
import * as AccountSubscription from "./AccountSubscription";
import * as Agent from "./Agent";
import * as AutomationRule from "./AutomationRule";
import * as Build from "./Build";
import * as BuildNotificationSubscription from "./BuildNotificationSubscription";
import * as BuildReview from "./BuildReview";
import * as BuildReviewer from "./BuildReviewer";
import * as Comment from "./Comment";
import * as Connection from "./Connection";
import * as DateDefs from "./Date";
import * as Deployment from "./Deployment";
import * as DiscordWebhook from "./DiscordWebhook";
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
import * as Media from "./Media";
import * as MetricsPeriod from "./MetricsPeriod";
import * as MsTeamsWebhook from "./MsTeamsWebhook";
import * as Node from "./Node";
import * as NotificationPreference from "./NotificationPreference";
import * as OAuthClient from "./OAuthClient";
import * as OAuthGrant from "./OAuthGrant";
import * as OriginInstallation from "./OriginInstallation";
import * as OriginPullRequest from "./OriginPullRequest";
import * as OriginRepository from "./OriginRepository";
import * as PageInfo from "./PageInfo";
import * as Plan from "./Plan";
import * as Project from "./Project";
import * as ProjectPullRequest from "./ProjectPullRequest";
import * as PullRequest from "./PullRequest";
import * as Repository from "./Repository";
import * as schema from "./schema";
import * as Screenshot from "./Screenshot";
import * as ScreenshotBucket from "./ScreenshotBucket";
import * as ScreenshotDiff from "./ScreenshotDiff";
import * as SlackInstallation from "./SlackInstallation";
import * as Staff from "./Staff";
import * as Team from "./Team";
import * as Test from "./Test";
import * as TestChange from "./TestChange";
import * as TestNotificationSubscription from "./TestNotificationSubscription";
import * as TimeSeries from "./TimeSeries";
import * as User from "./User";
import * as UserAccessToken from "./UserAccessToken";
import * as UserPasskey from "./UserPasskey";
import * as UserSession from "./UserSession";
import * as ValidationStatus from "./ValidationStatus";

export const definitions: { resolvers?: object; typeDefs?: DocumentNode }[] = [
  Account,
  AccountSubscription,
  Agent,
  AutomationRule,
  Build,
  BuildNotificationSubscription,
  BuildReview,
  BuildReviewer,
  Comment,
  Connection,
  DateDefs,
  Deployment,
  GhApiInstallation,
  GhApiRepository,
  GithubAccount,
  GithubInstallation,
  GithubPullRequest,
  GithubRepository,
  DiscordWebhook,
  GitlabProject,
  GitlabUser,
  GlApiNamespace,
  GlApiProject,
  GoogleUser,
  JobStatus,
  Media,
  MetricsPeriod,
  MsTeamsWebhook,
  Node,
  NotificationPreference,
  OAuthClient,
  OAuthGrant,
  OriginInstallation,
  OriginPullRequest,
  OriginRepository,
  PageInfo,
  Plan,
  Project,
  ProjectPullRequest,
  PullRequest,
  Repository,
  schema,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  SlackInstallation,
  Staff,
  Team,
  Test,
  TestChange,
  TestNotificationSubscription,
  TimeSeries,
  User,
  UserAccessToken,
  UserPasskey,
  UserSession,
  ValidationStatus,
];
