import type { DocumentNode } from "graphql";

import * as Account from "./Account.js";
import * as AccountSubscription from "./AccountSubscription.js";
import * as Build from "./Build.js";
import * as Connection from "./Connection.js";
import * as DateDefs from "./Date.js";
import * as GhApiInstallation from "./GhApiInstallation.js";
import * as GhApiRepository from "./GhApiRepository.js";
import * as GithubAccount from "./GithubAccount.js";
import * as GithubInstallation from "./GithubInstallation.js";
import * as GithubPullRequest from "./GithubPullRequest.js";
import * as GithubRepository from "./GithubRepository.js";
import * as GitlabProject from "./GitlabProject.js";
import * as GitlabUser from "./GitlabUser.js";
import * as GlApiNamespace from "./GlApiNamespace.js";
import * as GlApiProject from "./GlApiProject.js";
import * as GoogleUser from "./GoogleUser.js";
import * as JobStatus from "./JobStatus.js";
import * as Node from "./Node.js";
import * as PageInfo from "./PageInfo.js";
import * as Plan from "./Plan.js";
import * as Project from "./Project.js";
import * as PullRequest from "./PullRequest.js";
import * as Repository from "./Repository.js";
import * as schema from "./schema.js";
import * as Screenshot from "./Screenshot.js";
import * as ScreenshotBucket from "./ScreenshotBucket.js";
import * as ScreenshotDiff from "./ScreenshotDiff.js";
import * as SlackInstallation from "./SlackInstallation.js";
import * as Team from "./Team.js";
import * as User from "./User.js";
import * as ValidationStatus from "./ValidationStatus.js";

export const definitions: { resolvers?: object; typeDefs?: DocumentNode }[] = [
  Account,
  AccountSubscription,
  Build,
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
  Node,
  PageInfo,
  Plan,
  Project,
  PullRequest,
  Repository,
  schema,
  SlackInstallation,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Team,
  User,
  ValidationStatus,
];
