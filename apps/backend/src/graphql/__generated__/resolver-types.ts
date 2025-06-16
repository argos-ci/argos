import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { AccountAvatar, Subscription, AutomationRule, Build, BuildReview, GithubAccount, GithubInstallation, GithubPullRequest, GithubRepository, GitlabProject, GitlabUser, GoogleUser, Plan, ProjectUser, Screenshot, ScreenshotBucket, ScreenshotDiff, SlackInstallation, Project, Account, TeamUser, GithubAccountMember, Test } from '../../database/models/index.js';
import type { GhApiInstallation, GhApiRepository } from '../../github/index.js';
import type { GlApiNamespace, GlApiProject } from '../../gitlab/index.js';
import type { TestMetrics, TestChange } from '../../graphql/definitions/Test.js';
import type { Context } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: Date; output: Date; }
  DateTime: { input: Date; output: Date; }
  JSONObject: { input: any; output: any; }
  Time: { input: any; output: any; }
  Timestamp: { input: Number; output: Number; }
};

export type IAccount = {
  additionalScreenshotsCost: Scalars['Float']['output'];
  avatar: IAccountAvatar;
  blockWhenSpendLimitIsReached: Scalars['Boolean']['output'];
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  githubAccount?: Maybe<IGithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  gitlabBaseUrl?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<IGlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  meteredSpendLimitByPeriod?: Maybe<Scalars['Int']['output']>;
  metrics: IAccountMetrics;
  name?: Maybe<Scalars['String']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<IAccountPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  slackInstallation?: Maybe<ISlackInstallation>;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<IAccountSubscription>;
  subscriptionStatus?: Maybe<IAccountSubscriptionStatus>;
};


export type IAccountMetricsArgs = {
  input: IAccountMetricsInput;
};


export type IAccountProjectsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type IAccountAvatar = {
  __typename?: 'AccountAvatar';
  color: Scalars['String']['output'];
  initial: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};


export type IAccountAvatarUrlArgs = {
  size: Scalars['Int']['input'];
};

export type IAccountBuildsMetrics = {
  __typename?: 'AccountBuildsMetrics';
  all: IAccountMetricData;
  projects: Array<IProject>;
  series: Array<IAccountMetricDataPoint>;
};

export type IAccountMetricData = {
  __typename?: 'AccountMetricData';
  projects: Scalars['JSONObject']['output'];
  total: Scalars['Int']['output'];
};

export type IAccountMetricDataPoint = {
  __typename?: 'AccountMetricDataPoint';
  projects: Scalars['JSONObject']['output'];
  total: Scalars['Int']['output'];
  ts: Scalars['Timestamp']['output'];
};

export type IAccountMetrics = {
  __typename?: 'AccountMetrics';
  builds: IAccountBuildsMetrics;
  screenshots: IAccountScreenshotMetrics;
};

export type IAccountMetricsInput = {
  from: Scalars['DateTime']['input'];
  groupBy: ITimeSeriesGroupBy;
  projectIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export enum IAccountPermission {
  Admin = 'admin',
  View = 'view'
}

export type IAccountScreenshotMetrics = {
  __typename?: 'AccountScreenshotMetrics';
  all: IAccountMetricData;
  projects: Array<IProject>;
  series: Array<IAccountMetricDataPoint>;
};

export type IAccountSubscription = INode & {
  __typename?: 'AccountSubscription';
  currency: ICurrency;
  endDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  paymentMethodFilled: Scalars['Boolean']['output'];
  provider: IAccountSubscriptionProvider;
  status: IAccountSubscriptionStatus;
  trialDaysRemaining?: Maybe<Scalars['Int']['output']>;
};

export enum IAccountSubscriptionProvider {
  Github = 'github',
  Stripe = 'stripe'
}

export enum IAccountSubscriptionStatus {
  /** Ongoing paid subscription */
  Active = 'active',
  /** Post-cancelation date */
  Canceled = 'canceled',
  /** Incomplete */
  Incomplete = 'incomplete',
  /** Incomplete expired */
  IncompleteExpired = 'incomplete_expired',
  /** Payment due */
  PastDue = 'past_due',
  /** Paused */
  Paused = 'paused',
  /** Trial expired */
  TrialExpired = 'trial_expired',
  /** Ongoing trial */
  Trialing = 'trialing',
  /** Unpaid */
  Unpaid = 'unpaid'
}

export type IAddContributorToProjectInput = {
  level: IProjectUserLevel;
  projectId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type IAutomationAction = {
  __typename?: 'AutomationAction';
  action: Scalars['String']['output'];
  actionPayload: Scalars['JSONObject']['output'];
};

export type IAutomationActionInput = {
  payload: Scalars['JSONObject']['input'];
  type: Scalars['String']['input'];
};

export type IAutomationActionRun = INode & {
  __typename?: 'AutomationActionRun';
  actionName: Scalars['String']['output'];
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export enum IAutomationActionRunStatus {
  Aborted = 'aborted',
  Error = 'error',
  Failed = 'failed',
  Pending = 'pending',
  Progress = 'progress',
  Success = 'success'
}

export type IAutomationActionSendSlackMessagePayload = {
  __typename?: 'AutomationActionSendSlackMessagePayload';
  channelId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  slackId: Scalars['String']['output'];
};

export type IAutomationCondition = {
  __typename?: 'AutomationCondition';
  type: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type IAutomationConditionInput = {
  type: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type IAutomationConditions = {
  __typename?: 'AutomationConditions';
  all: Array<IAutomationCondition>;
};

export type IAutomationRule = INode & {
  __typename?: 'AutomationRule';
  active: Scalars['Boolean']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  if: IAutomationConditions;
  lastAutomationRun?: Maybe<IAutomationRun>;
  name: Scalars['String']['output'];
  on: Array<Scalars['String']['output']>;
  then: Array<IAutomationAction>;
  updatedAt: Scalars['DateTime']['output'];
};

export type IAutomationRuleConnection = IConnection & {
  __typename?: 'AutomationRuleConnection';
  edges: Array<IAutomationRule>;
  pageInfo: IPageInfo;
};

export type IAutomationRun = INode & {
  __typename?: 'AutomationRun';
  actionRuns: Array<IAutomationActionRun>;
  buildId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  event: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: IAutomationRunStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export enum IAutomationRunStatus {
  Failed = 'failed',
  Running = 'running',
  Success = 'success'
}

export enum IBaseBranchResolution {
  /** Base branch is resolved from the project settings */
  Project = 'project',
  /** Base branch is resolved from the pull request */
  PullRequest = 'pullRequest',
  /** Base branch specified by the user through the API / SDK */
  User = 'user'
}

export type IBuild = INode & {
  __typename?: 'Build';
  /** Base branch used to resolve the base build */
  baseBranch?: Maybe<Scalars['String']['output']>;
  /** Base branch resolved from */
  baseBranchResolvedFrom?: Maybe<IBaseBranchResolution>;
  /** The base build that contains the base screenshot bucket */
  baseBuild?: Maybe<IBuild>;
  /** The screenshot bucket that serves as base for comparison */
  baseScreenshotBucket?: Maybe<IScreenshotBucket>;
  /** Branch */
  branch?: Maybe<Scalars['String']['output']>;
  /** Commit */
  commit: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Aggregated metadata */
  metadata?: Maybe<IBuildMetadata>;
  /** Mode */
  mode: IBuildMode;
  /** Build name */
  name: Scalars['String']['output'];
  /** Continuous number. It is incremented after each build */
  number: Scalars['Int']['output'];
  /** Parallel infos */
  parallel?: Maybe<IBuildParallel>;
  /** Pull request head commit */
  prHeadCommit?: Maybe<Scalars['String']['output']>;
  /** Pull request number */
  prNumber?: Maybe<Scalars['Int']['output']>;
  /** Pull request */
  pullRequest?: Maybe<IPullRequest>;
  /** Effective build reviews */
  reviews: Array<IBuildReview>;
  /** The screenshot diffs between the base screenshot bucket of the compare screenshot bucket */
  screenshotDiffs: IScreenshotDiffConnection;
  /** Build stats */
  stats?: Maybe<IBuildStats>;
  /** Review status, conclusion or job status */
  status: IBuildStatus;
  /** Build type */
  type?: Maybe<IBuildType>;
  updatedAt: Scalars['DateTime']['output'];
};


export type IBuildScreenshotDiffsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
};

export type IBuildConnection = IConnection & {
  __typename?: 'BuildConnection';
  edges: Array<IBuild>;
  pageInfo: IPageInfo;
};

export type IBuildMetadata = {
  __typename?: 'BuildMetadata';
  testReport?: Maybe<ITestReport>;
};

export enum IBuildMode {
  /** Build is compared with a baseline found by analyzing Git history */
  Ci = 'ci',
  /** Build is compared with the latest approved build */
  Monitoring = 'monitoring'
}

export type IBuildParallel = {
  __typename?: 'BuildParallel';
  nonce: Scalars['String']['output'];
  received: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type IBuildReview = INode & {
  __typename?: 'BuildReview';
  date: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  state: IBuildReviewState;
  user?: Maybe<IUser>;
};

export enum IBuildReviewState {
  Approved = 'APPROVED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export type IBuildStats = {
  __typename?: 'BuildStats';
  added: Scalars['Int']['output'];
  changed: Scalars['Int']['output'];
  failure: Scalars['Int']['output'];
  removed: Scalars['Int']['output'];
  retryFailure: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  unchanged: Scalars['Int']['output'];
};

export enum IBuildStatus {
  /** job status: aborted */
  Aborted = 'ABORTED',
  /** reviewStatus: accepted */
  Accepted = 'ACCEPTED',
  /** conclusion: changes-detected */
  ChangesDetected = 'CHANGES_DETECTED',
  /** job status: complete */
  Error = 'ERROR',
  /** job status: expired */
  Expired = 'EXPIRED',
  /** conclusion: no-changes */
  NoChanges = 'NO_CHANGES',
  /** job status: pending */
  Pending = 'PENDING',
  /** job status: progress */
  Progress = 'PROGRESS',
  /** reviewStatus: rejected */
  Rejected = 'REJECTED'
}

export enum IBuildType {
  /** Comparison build */
  Check = 'check',
  /** No baseline build found */
  Orphan = 'orphan',
  /** Build auto-approved */
  Reference = 'reference'
}

export type IBuildsFilterInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Array<IBuildStatus>>;
  type?: InputMaybe<Array<IBuildType>>;
};

export type IConnection = {
  edges: Array<INode>;
  pageInfo: IPageInfo;
};

export type ICreateAutomationRuleInput = {
  actions: Array<IAutomationActionInput>;
  conditions: Array<IAutomationConditionInput>;
  events: Array<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type ICreateTeamInput = {
  name: Scalars['String']['input'];
};

export type ICreateTeamResult = {
  __typename?: 'CreateTeamResult';
  redirectUrl: Scalars['String']['output'];
  team: ITeam;
};

export enum ICurrency {
  Eur = 'EUR',
  Usd = 'USD'
}

export type IDeleteTeamInput = {
  accountId: Scalars['ID']['input'];
};

export type IDisableGitHubSsoOnTeamInput = {
  teamAccountId: Scalars['ID']['input'];
};

export type IDisconnectGitHubAuthInput = {
  accountId: Scalars['ID']['input'];
};

export type IDisconnectGitLabAuthInput = {
  accountId: Scalars['ID']['input'];
};

export type IDisconnectGoogleAuthInput = {
  accountId: Scalars['ID']['input'];
};

export type IEnableGitHubSsoOnTeamInput = {
  ghInstallationId: Scalars['Int']['input'];
  teamAccountId: Scalars['ID']['input'];
};

export type IGhApiInstallation = INode & {
  __typename?: 'GhApiInstallation';
  account: IGhApiInstallationAccount;
  id: Scalars['ID']['output'];
};

export type IGhApiInstallationAccount = INode & {
  __typename?: 'GhApiInstallationAccount';
  id: Scalars['ID']['output'];
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type IGhApiInstallationConnection = IConnection & {
  __typename?: 'GhApiInstallationConnection';
  edges: Array<IGhApiInstallation>;
  pageInfo: IPageInfo;
};

export type IGhApiRepository = INode & {
  __typename?: 'GhApiRepository';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  owner_login: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type IGhApiRepositoryConnection = IConnection & {
  __typename?: 'GhApiRepositoryConnection';
  edges: Array<IGhApiRepository>;
  pageInfo: IPageInfo;
};

export enum IGitHubAppType {
  Light = 'light',
  Main = 'main'
}

export type IGithubAccount = INode & {
  __typename?: 'GithubAccount';
  avatar: IAccountAvatar;
  id: Scalars['ID']['output'];
  lastLoggedAt?: Maybe<Scalars['DateTime']['output']>;
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type IGithubInstallation = INode & {
  __typename?: 'GithubInstallation';
  ghAccount?: Maybe<IGhApiInstallationAccount>;
  ghInstallation?: Maybe<IGhApiInstallation>;
  id: Scalars['ID']['output'];
};

export type IGithubPullRequest = INode & IPullRequest & {
  __typename?: 'GithubPullRequest';
  closedAt?: Maybe<Scalars['DateTime']['output']>;
  creator?: Maybe<IGithubAccount>;
  date?: Maybe<Scalars['DateTime']['output']>;
  draft?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  merged?: Maybe<Scalars['Boolean']['output']>;
  mergedAt?: Maybe<Scalars['DateTime']['output']>;
  number: Scalars['Int']['output'];
  state?: Maybe<IPullRequestState>;
  title?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type IGithubRepository = INode & IRepository & {
  __typename?: 'GithubRepository';
  defaultBranch: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  private: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
};

export type IGitlabProject = INode & IRepository & {
  __typename?: 'GitlabProject';
  defaultBranch: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  private: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
};

export type IGitlabUser = INode & {
  __typename?: 'GitlabUser';
  id: Scalars['ID']['output'];
  lastLoggedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  url: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type IGlApiNamespace = INode & {
  __typename?: 'GlApiNamespace';
  id: Scalars['ID']['output'];
  isProjectToken: Scalars['Boolean']['output'];
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export type IGlApiNamespaceConnection = IConnection & {
  __typename?: 'GlApiNamespaceConnection';
  edges: Array<IGlApiNamespace>;
  pageInfo: IPageInfo;
};

export type IGlApiProject = INode & {
  __typename?: 'GlApiProject';
  id: Scalars['ID']['output'];
  last_activity_at: Scalars['String']['output'];
  name: Scalars['String']['output'];
  namespace: IGlApiNamespace;
};

export type IGlApiProjectConnection = IConnection & {
  __typename?: 'GlApiProjectConnection';
  edges: Array<IGlApiProject>;
  pageInfo: IPageInfo;
};

export type IGoogleUser = INode & {
  __typename?: 'GoogleUser';
  id: Scalars['ID']['output'];
  lastLoggedAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  primaryEmail?: Maybe<Scalars['String']['output']>;
};

export type IImportGithubProjectInput = {
  accountSlug: Scalars['String']['input'];
  installationId: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  repo: Scalars['String']['input'];
};

export type IImportGitlabProjectInput = {
  accountSlug: Scalars['String']['input'];
  gitlabProjectId: Scalars['ID']['input'];
};

export enum IJobStatus {
  Aborted = 'aborted',
  Complete = 'complete',
  Error = 'error',
  Pending = 'pending',
  Progress = 'progress'
}

export type ILeaveTeamInput = {
  teamAccountId: Scalars['ID']['input'];
};

export type ILinkGithubRepositoryInput = {
  installationId: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  repo: Scalars['String']['input'];
};

export type ILinkGitlabProjectInput = {
  gitlabProjectId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export enum IMetricsPeriod {
  Last_3Days = 'LAST_3_DAYS',
  Last_7Days = 'LAST_7_DAYS',
  Last_24Hours = 'LAST_24_HOURS',
  Last_30Days = 'LAST_30_DAYS',
  Last_90Days = 'LAST_90_DAYS'
}

export type IMutation = {
  __typename?: 'Mutation';
  /** Accept an invitation to join a team */
  acceptInvitation: ITeam;
  /** Add contributor to project */
  addOrUpdateProjectContributor: IProjectContributor;
  /** Create automation */
  createAutomationRule: IAutomationRule;
  /** Create a team */
  createTeam: ICreateTeamResult;
  /** Deactivate automation */
  deactivateAutomationRule: IAutomationRule;
  /** Delete Project */
  deleteProject: Scalars['Boolean']['output'];
  /** Delete team and all its projects */
  deleteTeam: Scalars['Boolean']['output'];
  /** Disable GitHub SSO */
  disableGitHubSSOOnTeam: ITeam;
  /** Disconnect GitHub Account */
  disconnectGitHubAuth: IAccount;
  /** Disconnect GitLab Account */
  disconnectGitLabAuth: IAccount;
  /** Disconnect Google Account */
  disconnectGoogleAuth: IAccount;
  /** Enable GitHub SSO */
  enableGitHubSSOOnTeam: ITeam;
  /** Import a project from GitHub */
  importGithubProject: IProject;
  /** Import a project from GitLab */
  importGitlabProject: IProject;
  /** Leave a team */
  leaveTeam: Scalars['Boolean']['output'];
  /** Link GitHub Repository */
  linkGithubRepository: IProject;
  /** Link Gitlab Project */
  linkGitlabProject: IProject;
  ping: Scalars['Boolean']['output'];
  /** Regenerate project token */
  regenerateProjectToken: IProject;
  removeContributorFromProject: IRemoveContributorFromProjectPayload;
  /** Remove a user from a team */
  removeUserFromTeam: IRemoveUserFromTeamPayload;
  /** Set team default user level */
  setTeamDefaultUserLevel: ITeam;
  /** Set member level */
  setTeamMemberLevel: ITeamMember;
  /** Change the validationStatus on a build */
  setValidationStatus: IBuild;
  /** Test automation rule by sending a test event */
  testAutomation: Scalars['Boolean']['output'];
  /** Transfer Project to another account */
  transferProject: IProject;
  /** Uninstall Slack */
  uninstallSlack: IAccount;
  /** Unlink GitHub Repository */
  unlinkGithubRepository: IProject;
  /** Unlink Gitlab Project */
  unlinkGitlabProject: IProject;
  /** Update Account */
  updateAccount: IAccount;
  /** Update automation */
  updateAutomationRule: IAutomationRule;
  /** Update Project */
  updateProject: IProject;
  /** Set project pull request comment */
  updateProjectPrComment: IProject;
};


export type IMutationAcceptInvitationArgs = {
  token: Scalars['String']['input'];
};


export type IMutationAddOrUpdateProjectContributorArgs = {
  input: IAddContributorToProjectInput;
};


export type IMutationCreateAutomationRuleArgs = {
  input: ICreateAutomationRuleInput;
};


export type IMutationCreateTeamArgs = {
  input: ICreateTeamInput;
};


export type IMutationDeactivateAutomationRuleArgs = {
  id: Scalars['String']['input'];
};


export type IMutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type IMutationDeleteTeamArgs = {
  input: IDeleteTeamInput;
};


export type IMutationDisableGitHubSsoOnTeamArgs = {
  input: IDisableGitHubSsoOnTeamInput;
};


export type IMutationDisconnectGitHubAuthArgs = {
  input: IDisconnectGitHubAuthInput;
};


export type IMutationDisconnectGitLabAuthArgs = {
  input: IDisconnectGitLabAuthInput;
};


export type IMutationDisconnectGoogleAuthArgs = {
  input: IDisconnectGoogleAuthInput;
};


export type IMutationEnableGitHubSsoOnTeamArgs = {
  input: IEnableGitHubSsoOnTeamInput;
};


export type IMutationImportGithubProjectArgs = {
  input: IImportGithubProjectInput;
};


export type IMutationImportGitlabProjectArgs = {
  input: IImportGitlabProjectInput;
};


export type IMutationLeaveTeamArgs = {
  input: ILeaveTeamInput;
};


export type IMutationLinkGithubRepositoryArgs = {
  input: ILinkGithubRepositoryInput;
};


export type IMutationLinkGitlabProjectArgs = {
  input: ILinkGitlabProjectInput;
};


export type IMutationRegenerateProjectTokenArgs = {
  id: Scalars['ID']['input'];
};


export type IMutationRemoveContributorFromProjectArgs = {
  input: IRemoveContributorFromProjectInput;
};


export type IMutationRemoveUserFromTeamArgs = {
  input: IRemoveUserFromTeamInput;
};


export type IMutationSetTeamDefaultUserLevelArgs = {
  input: ISetTeamDefaultUserLevelInput;
};


export type IMutationSetTeamMemberLevelArgs = {
  input: ISetTeamMemberLevelInput;
};


export type IMutationSetValidationStatusArgs = {
  buildId: Scalars['ID']['input'];
  validationStatus: IValidationStatus;
};


export type IMutationTestAutomationArgs = {
  input: ITestAutomationRuleInput;
};


export type IMutationTransferProjectArgs = {
  input: ITransferProjectInput;
};


export type IMutationUninstallSlackArgs = {
  input: IUninstallSlackInput;
};


export type IMutationUnlinkGithubRepositoryArgs = {
  input: IUnlinkGithubRepositoryInput;
};


export type IMutationUnlinkGitlabProjectArgs = {
  input: IUnlinkGitlabProjectInput;
};


export type IMutationUpdateAccountArgs = {
  input: IUpdateAccountInput;
};


export type IMutationUpdateAutomationRuleArgs = {
  input: IUpdateAutomationRuleInput;
};


export type IMutationUpdateProjectArgs = {
  input: IUpdateProjectInput;
};


export type IMutationUpdateProjectPrCommentArgs = {
  input: IUpdateProjectPrCommentInput;
};

export type INode = {
  id: Scalars['ID']['output'];
};

export type IPageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type IPlan = INode & {
  __typename?: 'Plan';
  displayName: Scalars['String']['output'];
  fineGrainedAccessControlIncluded: Scalars['Boolean']['output'];
  githubSsoIncluded: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  usageBased: Scalars['Boolean']['output'];
};

export type IProject = INode & {
  __typename?: 'Project';
  /** Owner of the project */
  account: IAccount;
  /** Glob pattern for auto-approved branches */
  autoApprovedBranchGlob: Scalars['String']['output'];
  /** Automation rules */
  automationRules: IAutomationRuleConnection;
  /** A single build linked to the project */
  build?: Maybe<IBuild>;
  /** Build names */
  buildNames: Array<Scalars['String']['output']>;
  /** Builds associated to the project */
  builds: IBuildConnection;
  /** Contributors */
  contributors: IProjectContributorConnection;
  /** Current month used screenshots */
  currentPeriodScreenshots: Scalars['Int']['output'];
  /** Glob pattern for auto-approved branches edited by the user */
  customAutoApprovedBranchGlob?: Maybe<Scalars['String']['output']>;
  /** Default base branch edited by the user */
  customDefaultBaseBranch?: Maybe<Scalars['String']['output']>;
  /** Default base branch */
  defaultBaseBranch: Scalars['String']['output'];
  /** Default user access level applied to members that are not contributors */
  defaultUserLevel?: Maybe<IProjectUserLevel>;
  id: Scalars['ID']['output'];
  /** Latest auto-approved build */
  latestAutoApprovedBuild?: Maybe<IBuild>;
  /** Latest build */
  latestBuild?: Maybe<IBuild>;
  name: Scalars['String']['output'];
  /** Determine permissions of the current user */
  permissions: Array<IProjectPermission>;
  /** Pull request comment enabled */
  prCommentEnabled: Scalars['Boolean']['output'];
  /** Override repository's Github privacy */
  private?: Maybe<Scalars['Boolean']['output']>;
  /** Check if the project is public or not */
  public: Scalars['Boolean']['output'];
  /** Repository associated to the project */
  repository?: Maybe<IRepository>;
  /** Project slug */
  slug: Scalars['String']['output'];
  /** Summary check */
  summaryCheck: ISummaryCheck;
  /** Test associated to the project */
  test?: Maybe<ITest>;
  token?: Maybe<Scalars['String']['output']>;
  /** Total screenshots used */
  totalScreenshots: Scalars['Int']['output'];
};


export type IProjectAutomationRulesArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type IProjectBuildArgs = {
  number: Scalars['Int']['input'];
};


export type IProjectBuildsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  filters?: InputMaybe<IBuildsFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type IProjectContributorsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type IProjectTestArgs = {
  id: Scalars['ID']['input'];
};

export type IProjectConnection = IConnection & {
  __typename?: 'ProjectConnection';
  edges: Array<IProject>;
  pageInfo: IPageInfo;
};

export type IProjectContributor = INode & {
  __typename?: 'ProjectContributor';
  id: Scalars['ID']['output'];
  level: IProjectUserLevel;
  project: IProject;
  user: IUser;
};

export type IProjectContributorConnection = IConnection & {
  __typename?: 'ProjectContributorConnection';
  edges: Array<IProjectContributor>;
  pageInfo: IPageInfo;
};

export enum IProjectPermission {
  Admin = 'admin',
  Review = 'review',
  View = 'view',
  ViewSettings = 'view_settings'
}

export enum IProjectUserLevel {
  Admin = 'admin',
  Reviewer = 'reviewer',
  Viewer = 'viewer'
}

export type IPullRequest = {
  closedAt?: Maybe<Scalars['DateTime']['output']>;
  date?: Maybe<Scalars['DateTime']['output']>;
  draft?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  merged?: Maybe<Scalars['Boolean']['output']>;
  mergedAt?: Maybe<Scalars['DateTime']['output']>;
  number: Scalars['Int']['output'];
  state?: Maybe<IPullRequestState>;
  title?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export enum IPullRequestState {
  Closed = 'CLOSED',
  Open = 'OPEN'
}

export type IQuery = {
  __typename?: 'Query';
  /** Get Account by slug */
  account?: Maybe<IAccount>;
  /** Get Account by id */
  accountById?: Maybe<IAccount>;
  /** Get automation rule by ID */
  automationRule?: Maybe<IAutomationRule>;
  ghApiInstallationRepositories: IGhApiRepositoryConnection;
  glApiProjects: IGlApiProjectConnection;
  invitation?: Maybe<ITeam>;
  /** Get the authenticated user */
  me?: Maybe<IUser>;
  ping: Scalars['Boolean']['output'];
  /** Get a project */
  project?: Maybe<IProject>;
  /** Get a project */
  projectById?: Maybe<IProject>;
  /** Get Team by id */
  teamById?: Maybe<ITeam>;
};


export type IQueryAccountArgs = {
  slug: Scalars['String']['input'];
};


export type IQueryAccountByIdArgs = {
  id: Scalars['ID']['input'];
};


export type IQueryAutomationRuleArgs = {
  id: Scalars['String']['input'];
};


export type IQueryGhApiInstallationRepositoriesArgs = {
  fromAuthUser: Scalars['Boolean']['input'];
  installationId: Scalars['ID']['input'];
  page: Scalars['Int']['input'];
  reposPerPage?: InputMaybe<Scalars['Int']['input']>;
};


export type IQueryGlApiProjectsArgs = {
  accountId: Scalars['ID']['input'];
  allProjects: Scalars['Boolean']['input'];
  groupId?: InputMaybe<Scalars['ID']['input']>;
  page: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type IQueryInvitationArgs = {
  token: Scalars['String']['input'];
};


export type IQueryProjectArgs = {
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
};


export type IQueryProjectByIdArgs = {
  id: Scalars['ID']['input'];
};


export type IQueryTeamByIdArgs = {
  id: Scalars['ID']['input'];
};

export type IRemoveContributorFromProjectInput = {
  projectId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type IRemoveContributorFromProjectPayload = {
  __typename?: 'RemoveContributorFromProjectPayload';
  projectContributorId: Scalars['ID']['output'];
};

export type IRemoveUserFromTeamInput = {
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type IRemoveUserFromTeamPayload = {
  __typename?: 'RemoveUserFromTeamPayload';
  teamMemberId: Scalars['ID']['output'];
};

export type IRepository = {
  defaultBranch: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  private: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
};

export type IScreenshot = INode & {
  __typename?: 'Screenshot';
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  metadata?: Maybe<IScreenshotMetadata>;
  originalUrl: Scalars['String']['output'];
  playwrightTraceUrl?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type IScreenshotBucket = INode & {
  __typename?: 'ScreenshotBucket';
  branch?: Maybe<Scalars['String']['output']>;
  commit: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
};

export type IScreenshotDiff = INode & {
  __typename?: 'ScreenshotDiff';
  baseScreenshot?: Maybe<IScreenshot>;
  build: IBuild;
  /** Change ID of the screenshot diff. Used to be indefied in a test. */
  changeId?: Maybe<Scalars['String']['output']>;
  compareScreenshot?: Maybe<IScreenshot>;
  createdAt: Scalars['DateTime']['output'];
  group?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  last7daysOccurences: Scalars['Int']['output'];
  /** Name of the diff (either base or compare screenshot name) */
  name: Scalars['String']['output'];
  status: IScreenshotDiffStatus;
  test?: Maybe<ITest>;
  threshold?: Maybe<Scalars['Float']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  /** Unique key to identify screenshot variant (browser, resolution, retries) */
  variantKey: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type IScreenshotDiffConnection = IConnection & {
  __typename?: 'ScreenshotDiffConnection';
  edges: Array<IScreenshotDiff>;
  pageInfo: IPageInfo;
};

export enum IScreenshotDiffStatus {
  Added = 'added',
  Changed = 'changed',
  Failure = 'failure',
  Pending = 'pending',
  Removed = 'removed',
  RetryFailure = 'retryFailure',
  Unchanged = 'unchanged'
}

export type IScreenshotMetadata = {
  __typename?: 'ScreenshotMetadata';
  automationLibrary: IScreenshotMetadataAutomationLibrary;
  browser?: Maybe<IScreenshotMetadataBrowser>;
  colorScheme?: Maybe<IScreenshotMetadataColorScheme>;
  mediaType?: Maybe<IScreenshotMetadataMediaType>;
  previewUrl?: Maybe<Scalars['String']['output']>;
  sdk: IScreenshotMetadataSdk;
  test?: Maybe<IScreenshotMetadataTest>;
  url?: Maybe<Scalars['String']['output']>;
  viewport?: Maybe<IScreenshotMetadataViewport>;
};

export type IScreenshotMetadataAutomationLibrary = {
  __typename?: 'ScreenshotMetadataAutomationLibrary';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type IScreenshotMetadataBrowser = {
  __typename?: 'ScreenshotMetadataBrowser';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export enum IScreenshotMetadataColorScheme {
  Dark = 'dark',
  Light = 'light'
}

export type IScreenshotMetadataLocation = {
  __typename?: 'ScreenshotMetadataLocation';
  column: Scalars['Int']['output'];
  file: Scalars['String']['output'];
  line: Scalars['Int']['output'];
};

export enum IScreenshotMetadataMediaType {
  Print = 'print',
  Screen = 'screen'
}

export type IScreenshotMetadataSdk = {
  __typename?: 'ScreenshotMetadataSDK';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type IScreenshotMetadataTest = {
  __typename?: 'ScreenshotMetadataTest';
  id?: Maybe<Scalars['String']['output']>;
  location?: Maybe<IScreenshotMetadataLocation>;
  repeat?: Maybe<Scalars['Int']['output']>;
  retries?: Maybe<Scalars['Int']['output']>;
  retry?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  titlePath: Array<Scalars['String']['output']>;
};

export type IScreenshotMetadataViewport = {
  __typename?: 'ScreenshotMetadataViewport';
  height: Scalars['Int']['output'];
  width: Scalars['Int']['output'];
};

export type ISetTeamDefaultUserLevelInput = {
  level: ITeamDefaultUserLevel;
  teamAccountId: Scalars['ID']['input'];
};

export type ISetTeamMemberLevelInput = {
  level: ITeamUserLevel;
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type ISlackInstallation = INode & {
  __typename?: 'SlackInstallation';
  connectedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isUpToDate: Scalars['Boolean']['output'];
  teamDomain: Scalars['String']['output'];
  teamName: Scalars['String']['output'];
};

export enum ISummaryCheck {
  Always = 'always',
  Auto = 'auto',
  Never = 'never'
}

export type ITeam = IAccount & INode & {
  __typename?: 'Team';
  additionalScreenshotsCost: Scalars['Float']['output'];
  avatar: IAccountAvatar;
  blockWhenSpendLimitIsReached: Scalars['Boolean']['output'];
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  defaultUserLevel: ITeamDefaultUserLevel;
  githubAccount?: Maybe<IGithubAccount>;
  githubLightInstallation?: Maybe<IGithubInstallation>;
  githubMembers?: Maybe<ITeamGithubMemberConnection>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  gitlabBaseUrl?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<IGlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  inviteLink?: Maybe<Scalars['String']['output']>;
  me?: Maybe<ITeamMember>;
  members: ITeamMemberConnection;
  meteredSpendLimitByPeriod?: Maybe<Scalars['Int']['output']>;
  metrics: IAccountMetrics;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidSubscription?: Maybe<IAccountSubscription>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<IAccountPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  slackInstallation?: Maybe<ISlackInstallation>;
  slug: Scalars['String']['output'];
  ssoGithubAccount?: Maybe<IGithubAccount>;
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<IAccountSubscription>;
  subscriptionStatus?: Maybe<IAccountSubscriptionStatus>;
};


export type ITeamGithubMembersArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  isTeamMember?: InputMaybe<Scalars['Boolean']['input']>;
};


export type ITeamMembersArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  levels?: InputMaybe<Array<ITeamUserLevel>>;
  search?: InputMaybe<Scalars['String']['input']>;
  sso?: InputMaybe<Scalars['Boolean']['input']>;
};


export type ITeamMetricsArgs = {
  input: IAccountMetricsInput;
};


export type ITeamProjectsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export enum ITeamDefaultUserLevel {
  Contributor = 'contributor',
  Member = 'member'
}

export type ITeamGithubMember = INode & {
  __typename?: 'TeamGithubMember';
  githubAccount: IGithubAccount;
  id: Scalars['ID']['output'];
  teamMember?: Maybe<ITeamMember>;
};

export type ITeamGithubMemberConnection = IConnection & {
  __typename?: 'TeamGithubMemberConnection';
  edges: Array<ITeamGithubMember>;
  pageInfo: IPageInfo;
};

export type ITeamMember = INode & {
  __typename?: 'TeamMember';
  id: Scalars['ID']['output'];
  level: ITeamUserLevel;
  user: IUser;
};

export type ITeamMemberConnection = IConnection & {
  __typename?: 'TeamMemberConnection';
  edges: Array<ITeamMember>;
  pageInfo: IPageInfo;
};

export enum ITeamUserLevel {
  Contributor = 'contributor',
  Member = 'member',
  Owner = 'owner'
}

export type ITest = INode & {
  __typename?: 'Test';
  changes: ITestChangesConnection;
  firstSeenDiff?: Maybe<IScreenshotDiff>;
  id: Scalars['ID']['output'];
  lastSeenDiff?: Maybe<IScreenshotDiff>;
  metrics: ITestMetrics;
  name: Scalars['String']['output'];
  status: ITestStatus;
};


export type ITestChangesArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
  period: IMetricsPeriod;
};


export type ITestMetricsArgs = {
  period?: InputMaybe<IMetricsPeriod>;
};

export type ITestAutomationRuleInput = {
  actions: Array<IAutomationActionInput>;
  event: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type ITestChange = INode & {
  __typename?: 'TestChange';
  id: Scalars['ID']['output'];
  stats: ITestChangeStats;
};


export type ITestChangeStatsArgs = {
  period: IMetricsPeriod;
};

export type ITestChangeStats = {
  __typename?: 'TestChangeStats';
  firstSeenDiff: IScreenshotDiff;
  lastSeenDiff: IScreenshotDiff;
  totalOccurences: Scalars['Int']['output'];
};

export type ITestChangesConnection = IConnection & {
  __typename?: 'TestChangesConnection';
  edges: Array<ITestChange>;
  pageInfo: IPageInfo;
};

export type ITestMetricData = {
  __typename?: 'TestMetricData';
  changes: Scalars['Int']['output'];
  consistency: Scalars['Float']['output'];
  flakiness: Scalars['Float']['output'];
  stability: Scalars['Float']['output'];
  total: Scalars['Int']['output'];
  uniqueChanges: Scalars['Int']['output'];
};

export type ITestMetricDataPoint = {
  __typename?: 'TestMetricDataPoint';
  changes: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  ts: Scalars['Timestamp']['output'];
  uniqueChanges: Scalars['Int']['output'];
};

export type ITestMetrics = {
  __typename?: 'TestMetrics';
  all: ITestMetricData;
  series: Array<ITestMetricDataPoint>;
};

export type ITestReport = {
  __typename?: 'TestReport';
  stats?: Maybe<ITestReportStats>;
  status: ITestReportStatus;
};

export type ITestReportStats = {
  __typename?: 'TestReportStats';
  duration?: Maybe<Scalars['Int']['output']>;
  startTime?: Maybe<Scalars['DateTime']['output']>;
};

export enum ITestReportStatus {
  Failed = 'failed',
  Interrupted = 'interrupted',
  Passed = 'passed',
  Timedout = 'timedout'
}

export enum ITestStatus {
  Ongoing = 'ONGOING',
  Removed = 'REMOVED'
}

export enum ITimeSeriesGroupBy {
  Day = 'day',
  Month = 'month',
  Week = 'week'
}

export type ITransferProjectInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  targetAccountId: Scalars['ID']['input'];
};

export type IUninstallSlackInput = {
  accountId: Scalars['ID']['input'];
};

export type IUnlinkGithubRepositoryInput = {
  projectId: Scalars['ID']['input'];
};

export type IUnlinkGitlabProjectInput = {
  projectId: Scalars['ID']['input'];
};

export type IUpdateAccountInput = {
  blockWhenSpendLimitIsReached?: InputMaybe<Scalars['Boolean']['input']>;
  gitlabAccessToken?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  meteredSpendLimitByPeriod?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type IUpdateAutomationRuleInput = {
  actions: Array<IAutomationActionInput>;
  conditions: Array<IAutomationConditionInput>;
  events: Array<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type IUpdateProjectInput = {
  autoApprovedBranchGlob?: InputMaybe<Scalars['String']['input']>;
  defaultBaseBranch?: InputMaybe<Scalars['String']['input']>;
  defaultUserLevel?: InputMaybe<IProjectUserLevel>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  summaryCheck?: InputMaybe<ISummaryCheck>;
};

export type IUpdateProjectPrCommentInput = {
  enabled: Scalars['Boolean']['input'];
  projectId: Scalars['ID']['input'];
};

export type IUser = IAccount & INode & {
  __typename?: 'User';
  additionalScreenshotsCost: Scalars['Float']['output'];
  avatar: IAccountAvatar;
  blockWhenSpendLimitIsReached: Scalars['Boolean']['output'];
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  email?: Maybe<Scalars['String']['output']>;
  ghInstallations: IGhApiInstallationConnection;
  githubAccount?: Maybe<IGithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  gitlabBaseUrl?: Maybe<Scalars['String']['output']>;
  gitlabUser?: Maybe<IGitlabUser>;
  glNamespaces?: Maybe<IGlApiNamespaceConnection>;
  googleUser?: Maybe<IGoogleUser>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasSubscribedToTrial: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  lastSubscription?: Maybe<IAccountSubscription>;
  meteredSpendLimitByPeriod?: Maybe<Scalars['Int']['output']>;
  metrics: IAccountMetrics;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidSubscription?: Maybe<IAccountSubscription>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<IAccountPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  projectsContributedOn: IProjectContributorConnection;
  slackInstallation?: Maybe<ISlackInstallation>;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<IAccountSubscription>;
  subscriptionStatus?: Maybe<IAccountSubscriptionStatus>;
  teams: Array<ITeam>;
};


export type IUserMetricsArgs = {
  input: IAccountMetricsInput;
};


export type IUserProjectsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type IUserProjectsContributedOnArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
};

export type IUserConnection = IConnection & {
  __typename?: 'UserConnection';
  edges: Array<IUser>;
  pageInfo: IPageInfo;
};

export enum IValidationStatus {
  Accepted = 'accepted',
  Rejected = 'rejected',
  Unknown = 'unknown'
}

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;


/** Mapping of interface types */
export type IResolversInterfaceTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  Account: ( Account ) | ( Account );
  Connection: ( Omit<IAutomationRuleConnection, 'edges'> & { edges: Array<_RefType['AutomationRule']> } ) | ( Omit<IBuildConnection, 'edges'> & { edges: Array<_RefType['Build']> } ) | ( Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<_RefType['GhApiInstallation']> } ) | ( Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<_RefType['GhApiRepository']> } ) | ( Omit<IGlApiNamespaceConnection, 'edges'> & { edges: Array<_RefType['GlApiNamespace']> } ) | ( Omit<IGlApiProjectConnection, 'edges'> & { edges: Array<_RefType['GlApiProject']> } ) | ( Omit<IProjectConnection, 'edges'> & { edges: Array<_RefType['Project']> } ) | ( Omit<IProjectContributorConnection, 'edges'> & { edges: Array<_RefType['ProjectContributor']> } ) | ( Omit<IScreenshotDiffConnection, 'edges'> & { edges: Array<_RefType['ScreenshotDiff']> } ) | ( Omit<ITeamGithubMemberConnection, 'edges'> & { edges: Array<_RefType['TeamGithubMember']> } ) | ( Omit<ITeamMemberConnection, 'edges'> & { edges: Array<_RefType['TeamMember']> } ) | ( Omit<ITestChangesConnection, 'edges'> & { edges: Array<_RefType['TestChange']> } ) | ( Omit<IUserConnection, 'edges'> & { edges: Array<_RefType['User']> } );
  Node: ( Subscription ) | ( IAutomationActionRun ) | ( AutomationRule ) | ( IAutomationRun ) | ( Build ) | ( BuildReview ) | ( GhApiInstallation ) | ( IGhApiInstallationAccount ) | ( GhApiRepository ) | ( GithubAccount ) | ( GithubInstallation ) | ( GithubPullRequest ) | ( GithubRepository ) | ( GitlabProject ) | ( GitlabUser ) | ( GlApiNamespace ) | ( GlApiProject ) | ( GoogleUser ) | ( Plan ) | ( Project ) | ( ProjectUser ) | ( Screenshot ) | ( ScreenshotBucket ) | ( ScreenshotDiff ) | ( SlackInstallation ) | ( Account ) | ( GithubAccountMember ) | ( TeamUser ) | ( Test ) | ( TestChange ) | ( Account );
  PullRequest: ( GithubPullRequest );
  Repository: ( GithubRepository ) | ( GitlabProject );
}>;

/** Mapping between all available schema types and the resolvers types */
export type IResolversTypes = ResolversObject<{
  Account: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['Account']>;
  AccountAvatar: ResolverTypeWrapper<AccountAvatar>;
  AccountBuildsMetrics: ResolverTypeWrapper<Omit<IAccountBuildsMetrics, 'projects'> & { projects: Array<IResolversTypes['Project']> }>;
  AccountMetricData: ResolverTypeWrapper<IAccountMetricData>;
  AccountMetricDataPoint: ResolverTypeWrapper<IAccountMetricDataPoint>;
  AccountMetrics: ResolverTypeWrapper<Omit<IAccountMetrics, 'builds' | 'screenshots'> & { builds: IResolversTypes['AccountBuildsMetrics'], screenshots: IResolversTypes['AccountScreenshotMetrics'] }>;
  AccountMetricsInput: IAccountMetricsInput;
  AccountPermission: IAccountPermission;
  AccountScreenshotMetrics: ResolverTypeWrapper<Omit<IAccountScreenshotMetrics, 'projects'> & { projects: Array<IResolversTypes['Project']> }>;
  AccountSubscription: ResolverTypeWrapper<Subscription>;
  AccountSubscriptionProvider: IAccountSubscriptionProvider;
  AccountSubscriptionStatus: IAccountSubscriptionStatus;
  AddContributorToProjectInput: IAddContributorToProjectInput;
  AutomationAction: ResolverTypeWrapper<IAutomationAction>;
  AutomationActionInput: IAutomationActionInput;
  AutomationActionRun: ResolverTypeWrapper<IAutomationActionRun>;
  AutomationActionRunStatus: IAutomationActionRunStatus;
  AutomationActionSendSlackMessagePayload: ResolverTypeWrapper<IAutomationActionSendSlackMessagePayload>;
  AutomationCondition: ResolverTypeWrapper<IAutomationCondition>;
  AutomationConditionInput: IAutomationConditionInput;
  AutomationConditions: ResolverTypeWrapper<IAutomationConditions>;
  AutomationRule: ResolverTypeWrapper<AutomationRule>;
  AutomationRuleConnection: ResolverTypeWrapper<Omit<IAutomationRuleConnection, 'edges'> & { edges: Array<IResolversTypes['AutomationRule']> }>;
  AutomationRun: ResolverTypeWrapper<IAutomationRun>;
  AutomationRunStatus: IAutomationRunStatus;
  BaseBranchResolution: IBaseBranchResolution;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Build: ResolverTypeWrapper<Build>;
  BuildConnection: ResolverTypeWrapper<Omit<IBuildConnection, 'edges'> & { edges: Array<IResolversTypes['Build']> }>;
  BuildMetadata: ResolverTypeWrapper<IBuildMetadata>;
  BuildMode: IBuildMode;
  BuildParallel: ResolverTypeWrapper<IBuildParallel>;
  BuildReview: ResolverTypeWrapper<BuildReview>;
  BuildReviewState: IBuildReviewState;
  BuildStats: ResolverTypeWrapper<IBuildStats>;
  BuildStatus: IBuildStatus;
  BuildType: IBuildType;
  BuildsFilterInput: IBuildsFilterInput;
  Connection: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['Connection']>;
  CreateAutomationRuleInput: ICreateAutomationRuleInput;
  CreateTeamInput: ICreateTeamInput;
  CreateTeamResult: ResolverTypeWrapper<Omit<ICreateTeamResult, 'team'> & { team: IResolversTypes['Team'] }>;
  Currency: ICurrency;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteTeamInput: IDeleteTeamInput;
  DisableGitHubSSOOnTeamInput: IDisableGitHubSsoOnTeamInput;
  DisconnectGitHubAuthInput: IDisconnectGitHubAuthInput;
  DisconnectGitLabAuthInput: IDisconnectGitLabAuthInput;
  DisconnectGoogleAuthInput: IDisconnectGoogleAuthInput;
  EnableGitHubSSOOnTeamInput: IEnableGitHubSsoOnTeamInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GhApiInstallation: ResolverTypeWrapper<GhApiInstallation>;
  GhApiInstallationAccount: ResolverTypeWrapper<IGhApiInstallationAccount>;
  GhApiInstallationConnection: ResolverTypeWrapper<Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<IResolversTypes['GhApiInstallation']> }>;
  GhApiRepository: ResolverTypeWrapper<GhApiRepository>;
  GhApiRepositoryConnection: ResolverTypeWrapper<Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<IResolversTypes['GhApiRepository']> }>;
  GitHubAppType: IGitHubAppType;
  GithubAccount: ResolverTypeWrapper<GithubAccount>;
  GithubInstallation: ResolverTypeWrapper<GithubInstallation>;
  GithubPullRequest: ResolverTypeWrapper<GithubPullRequest>;
  GithubRepository: ResolverTypeWrapper<GithubRepository>;
  GitlabProject: ResolverTypeWrapper<GitlabProject>;
  GitlabUser: ResolverTypeWrapper<GitlabUser>;
  GlApiNamespace: ResolverTypeWrapper<GlApiNamespace>;
  GlApiNamespaceConnection: ResolverTypeWrapper<Omit<IGlApiNamespaceConnection, 'edges'> & { edges: Array<IResolversTypes['GlApiNamespace']> }>;
  GlApiProject: ResolverTypeWrapper<GlApiProject>;
  GlApiProjectConnection: ResolverTypeWrapper<Omit<IGlApiProjectConnection, 'edges'> & { edges: Array<IResolversTypes['GlApiProject']> }>;
  GoogleUser: ResolverTypeWrapper<GoogleUser>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ImportGithubProjectInput: IImportGithubProjectInput;
  ImportGitlabProjectInput: IImportGitlabProjectInput;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSONObject: ResolverTypeWrapper<Scalars['JSONObject']['output']>;
  JobStatus: IJobStatus;
  LeaveTeamInput: ILeaveTeamInput;
  LinkGithubRepositoryInput: ILinkGithubRepositoryInput;
  LinkGitlabProjectInput: ILinkGitlabProjectInput;
  MetricsPeriod: IMetricsPeriod;
  Mutation: ResolverTypeWrapper<{}>;
  Node: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<IPageInfo>;
  Plan: ResolverTypeWrapper<Plan>;
  Project: ResolverTypeWrapper<Project>;
  ProjectConnection: ResolverTypeWrapper<Omit<IProjectConnection, 'edges'> & { edges: Array<IResolversTypes['Project']> }>;
  ProjectContributor: ResolverTypeWrapper<ProjectUser>;
  ProjectContributorConnection: ResolverTypeWrapper<Omit<IProjectContributorConnection, 'edges'> & { edges: Array<IResolversTypes['ProjectContributor']> }>;
  ProjectPermission: IProjectPermission;
  ProjectUserLevel: IProjectUserLevel;
  PullRequest: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['PullRequest']>;
  PullRequestState: IPullRequestState;
  Query: ResolverTypeWrapper<{}>;
  RemoveContributorFromProjectInput: IRemoveContributorFromProjectInput;
  RemoveContributorFromProjectPayload: ResolverTypeWrapper<IRemoveContributorFromProjectPayload>;
  RemoveUserFromTeamInput: IRemoveUserFromTeamInput;
  RemoveUserFromTeamPayload: ResolverTypeWrapper<IRemoveUserFromTeamPayload>;
  Repository: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['Repository']>;
  Screenshot: ResolverTypeWrapper<Screenshot>;
  ScreenshotBucket: ResolverTypeWrapper<ScreenshotBucket>;
  ScreenshotDiff: ResolverTypeWrapper<ScreenshotDiff>;
  ScreenshotDiffConnection: ResolverTypeWrapper<Omit<IScreenshotDiffConnection, 'edges'> & { edges: Array<IResolversTypes['ScreenshotDiff']> }>;
  ScreenshotDiffStatus: IScreenshotDiffStatus;
  ScreenshotMetadata: ResolverTypeWrapper<IScreenshotMetadata>;
  ScreenshotMetadataAutomationLibrary: ResolverTypeWrapper<IScreenshotMetadataAutomationLibrary>;
  ScreenshotMetadataBrowser: ResolverTypeWrapper<IScreenshotMetadataBrowser>;
  ScreenshotMetadataColorScheme: IScreenshotMetadataColorScheme;
  ScreenshotMetadataLocation: ResolverTypeWrapper<IScreenshotMetadataLocation>;
  ScreenshotMetadataMediaType: IScreenshotMetadataMediaType;
  ScreenshotMetadataSDK: ResolverTypeWrapper<IScreenshotMetadataSdk>;
  ScreenshotMetadataTest: ResolverTypeWrapper<IScreenshotMetadataTest>;
  ScreenshotMetadataViewport: ResolverTypeWrapper<IScreenshotMetadataViewport>;
  SetTeamDefaultUserLevelInput: ISetTeamDefaultUserLevelInput;
  SetTeamMemberLevelInput: ISetTeamMemberLevelInput;
  SlackInstallation: ResolverTypeWrapper<SlackInstallation>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SummaryCheck: ISummaryCheck;
  Team: ResolverTypeWrapper<Account>;
  TeamDefaultUserLevel: ITeamDefaultUserLevel;
  TeamGithubMember: ResolverTypeWrapper<GithubAccountMember>;
  TeamGithubMemberConnection: ResolverTypeWrapper<Omit<ITeamGithubMemberConnection, 'edges'> & { edges: Array<IResolversTypes['TeamGithubMember']> }>;
  TeamMember: ResolverTypeWrapper<TeamUser>;
  TeamMemberConnection: ResolverTypeWrapper<Omit<ITeamMemberConnection, 'edges'> & { edges: Array<IResolversTypes['TeamMember']> }>;
  TeamUserLevel: ITeamUserLevel;
  Test: ResolverTypeWrapper<Test>;
  TestAutomationRuleInput: ITestAutomationRuleInput;
  TestChange: ResolverTypeWrapper<TestChange>;
  TestChangeStats: ResolverTypeWrapper<Omit<ITestChangeStats, 'firstSeenDiff' | 'lastSeenDiff'> & { firstSeenDiff: IResolversTypes['ScreenshotDiff'], lastSeenDiff: IResolversTypes['ScreenshotDiff'] }>;
  TestChangesConnection: ResolverTypeWrapper<Omit<ITestChangesConnection, 'edges'> & { edges: Array<IResolversTypes['TestChange']> }>;
  TestMetricData: ResolverTypeWrapper<ITestMetricData>;
  TestMetricDataPoint: ResolverTypeWrapper<ITestMetricDataPoint>;
  TestMetrics: ResolverTypeWrapper<TestMetrics>;
  TestReport: ResolverTypeWrapper<ITestReport>;
  TestReportStats: ResolverTypeWrapper<ITestReportStats>;
  TestReportStatus: ITestReportStatus;
  TestStatus: ITestStatus;
  Time: ResolverTypeWrapper<Scalars['Time']['output']>;
  TimeSeriesGroupBy: ITimeSeriesGroupBy;
  Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
  TransferProjectInput: ITransferProjectInput;
  UninstallSlackInput: IUninstallSlackInput;
  UnlinkGithubRepositoryInput: IUnlinkGithubRepositoryInput;
  UnlinkGitlabProjectInput: IUnlinkGitlabProjectInput;
  UpdateAccountInput: IUpdateAccountInput;
  UpdateAutomationRuleInput: IUpdateAutomationRuleInput;
  UpdateProjectInput: IUpdateProjectInput;
  UpdateProjectPrCommentInput: IUpdateProjectPrCommentInput;
  User: ResolverTypeWrapper<Account>;
  UserConnection: ResolverTypeWrapper<Omit<IUserConnection, 'edges'> & { edges: Array<IResolversTypes['User']> }>;
  ValidationStatus: IValidationStatus;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type IResolversParentTypes = ResolversObject<{
  Account: IResolversInterfaceTypes<IResolversParentTypes>['Account'];
  AccountAvatar: AccountAvatar;
  AccountBuildsMetrics: Omit<IAccountBuildsMetrics, 'projects'> & { projects: Array<IResolversParentTypes['Project']> };
  AccountMetricData: IAccountMetricData;
  AccountMetricDataPoint: IAccountMetricDataPoint;
  AccountMetrics: Omit<IAccountMetrics, 'builds' | 'screenshots'> & { builds: IResolversParentTypes['AccountBuildsMetrics'], screenshots: IResolversParentTypes['AccountScreenshotMetrics'] };
  AccountMetricsInput: IAccountMetricsInput;
  AccountScreenshotMetrics: Omit<IAccountScreenshotMetrics, 'projects'> & { projects: Array<IResolversParentTypes['Project']> };
  AccountSubscription: Subscription;
  AddContributorToProjectInput: IAddContributorToProjectInput;
  AutomationAction: IAutomationAction;
  AutomationActionInput: IAutomationActionInput;
  AutomationActionRun: IAutomationActionRun;
  AutomationActionSendSlackMessagePayload: IAutomationActionSendSlackMessagePayload;
  AutomationCondition: IAutomationCondition;
  AutomationConditionInput: IAutomationConditionInput;
  AutomationConditions: IAutomationConditions;
  AutomationRule: AutomationRule;
  AutomationRuleConnection: Omit<IAutomationRuleConnection, 'edges'> & { edges: Array<IResolversParentTypes['AutomationRule']> };
  AutomationRun: IAutomationRun;
  Boolean: Scalars['Boolean']['output'];
  Build: Build;
  BuildConnection: Omit<IBuildConnection, 'edges'> & { edges: Array<IResolversParentTypes['Build']> };
  BuildMetadata: IBuildMetadata;
  BuildParallel: IBuildParallel;
  BuildReview: BuildReview;
  BuildStats: IBuildStats;
  BuildsFilterInput: IBuildsFilterInput;
  Connection: IResolversInterfaceTypes<IResolversParentTypes>['Connection'];
  CreateAutomationRuleInput: ICreateAutomationRuleInput;
  CreateTeamInput: ICreateTeamInput;
  CreateTeamResult: Omit<ICreateTeamResult, 'team'> & { team: IResolversParentTypes['Team'] };
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  DeleteTeamInput: IDeleteTeamInput;
  DisableGitHubSSOOnTeamInput: IDisableGitHubSsoOnTeamInput;
  DisconnectGitHubAuthInput: IDisconnectGitHubAuthInput;
  DisconnectGitLabAuthInput: IDisconnectGitLabAuthInput;
  DisconnectGoogleAuthInput: IDisconnectGoogleAuthInput;
  EnableGitHubSSOOnTeamInput: IEnableGitHubSsoOnTeamInput;
  Float: Scalars['Float']['output'];
  GhApiInstallation: GhApiInstallation;
  GhApiInstallationAccount: IGhApiInstallationAccount;
  GhApiInstallationConnection: Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<IResolversParentTypes['GhApiInstallation']> };
  GhApiRepository: GhApiRepository;
  GhApiRepositoryConnection: Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<IResolversParentTypes['GhApiRepository']> };
  GithubAccount: GithubAccount;
  GithubInstallation: GithubInstallation;
  GithubPullRequest: GithubPullRequest;
  GithubRepository: GithubRepository;
  GitlabProject: GitlabProject;
  GitlabUser: GitlabUser;
  GlApiNamespace: GlApiNamespace;
  GlApiNamespaceConnection: Omit<IGlApiNamespaceConnection, 'edges'> & { edges: Array<IResolversParentTypes['GlApiNamespace']> };
  GlApiProject: GlApiProject;
  GlApiProjectConnection: Omit<IGlApiProjectConnection, 'edges'> & { edges: Array<IResolversParentTypes['GlApiProject']> };
  GoogleUser: GoogleUser;
  ID: Scalars['ID']['output'];
  ImportGithubProjectInput: IImportGithubProjectInput;
  ImportGitlabProjectInput: IImportGitlabProjectInput;
  Int: Scalars['Int']['output'];
  JSONObject: Scalars['JSONObject']['output'];
  LeaveTeamInput: ILeaveTeamInput;
  LinkGithubRepositoryInput: ILinkGithubRepositoryInput;
  LinkGitlabProjectInput: ILinkGitlabProjectInput;
  Mutation: {};
  Node: IResolversInterfaceTypes<IResolversParentTypes>['Node'];
  PageInfo: IPageInfo;
  Plan: Plan;
  Project: Project;
  ProjectConnection: Omit<IProjectConnection, 'edges'> & { edges: Array<IResolversParentTypes['Project']> };
  ProjectContributor: ProjectUser;
  ProjectContributorConnection: Omit<IProjectContributorConnection, 'edges'> & { edges: Array<IResolversParentTypes['ProjectContributor']> };
  PullRequest: IResolversInterfaceTypes<IResolversParentTypes>['PullRequest'];
  Query: {};
  RemoveContributorFromProjectInput: IRemoveContributorFromProjectInput;
  RemoveContributorFromProjectPayload: IRemoveContributorFromProjectPayload;
  RemoveUserFromTeamInput: IRemoveUserFromTeamInput;
  RemoveUserFromTeamPayload: IRemoveUserFromTeamPayload;
  Repository: IResolversInterfaceTypes<IResolversParentTypes>['Repository'];
  Screenshot: Screenshot;
  ScreenshotBucket: ScreenshotBucket;
  ScreenshotDiff: ScreenshotDiff;
  ScreenshotDiffConnection: Omit<IScreenshotDiffConnection, 'edges'> & { edges: Array<IResolversParentTypes['ScreenshotDiff']> };
  ScreenshotMetadata: IScreenshotMetadata;
  ScreenshotMetadataAutomationLibrary: IScreenshotMetadataAutomationLibrary;
  ScreenshotMetadataBrowser: IScreenshotMetadataBrowser;
  ScreenshotMetadataLocation: IScreenshotMetadataLocation;
  ScreenshotMetadataSDK: IScreenshotMetadataSdk;
  ScreenshotMetadataTest: IScreenshotMetadataTest;
  ScreenshotMetadataViewport: IScreenshotMetadataViewport;
  SetTeamDefaultUserLevelInput: ISetTeamDefaultUserLevelInput;
  SetTeamMemberLevelInput: ISetTeamMemberLevelInput;
  SlackInstallation: SlackInstallation;
  String: Scalars['String']['output'];
  Team: Account;
  TeamGithubMember: GithubAccountMember;
  TeamGithubMemberConnection: Omit<ITeamGithubMemberConnection, 'edges'> & { edges: Array<IResolversParentTypes['TeamGithubMember']> };
  TeamMember: TeamUser;
  TeamMemberConnection: Omit<ITeamMemberConnection, 'edges'> & { edges: Array<IResolversParentTypes['TeamMember']> };
  Test: Test;
  TestAutomationRuleInput: ITestAutomationRuleInput;
  TestChange: TestChange;
  TestChangeStats: Omit<ITestChangeStats, 'firstSeenDiff' | 'lastSeenDiff'> & { firstSeenDiff: IResolversParentTypes['ScreenshotDiff'], lastSeenDiff: IResolversParentTypes['ScreenshotDiff'] };
  TestChangesConnection: Omit<ITestChangesConnection, 'edges'> & { edges: Array<IResolversParentTypes['TestChange']> };
  TestMetricData: ITestMetricData;
  TestMetricDataPoint: ITestMetricDataPoint;
  TestMetrics: TestMetrics;
  TestReport: ITestReport;
  TestReportStats: ITestReportStats;
  Time: Scalars['Time']['output'];
  Timestamp: Scalars['Timestamp']['output'];
  TransferProjectInput: ITransferProjectInput;
  UninstallSlackInput: IUninstallSlackInput;
  UnlinkGithubRepositoryInput: IUnlinkGithubRepositoryInput;
  UnlinkGitlabProjectInput: IUnlinkGitlabProjectInput;
  UpdateAccountInput: IUpdateAccountInput;
  UpdateAutomationRuleInput: IUpdateAutomationRuleInput;
  UpdateProjectInput: IUpdateProjectInput;
  UpdateProjectPrCommentInput: IUpdateProjectPrCommentInput;
  User: Account;
  UserConnection: Omit<IUserConnection, 'edges'> & { edges: Array<IResolversParentTypes['User']> };
}>;

export type IAccountResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Account'] = IResolversParentTypes['Account']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Team' | 'User', ParentType, ContextType>;
  additionalScreenshotsCost?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  blockWhenSpendLimitIsReached?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  consumptionRatio?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  githubAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  gitlabAccessToken?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  gitlabBaseUrl?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  glNamespaces?: Resolver<Maybe<IResolversTypes['GlApiNamespaceConnection']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  includedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  meteredSpendLimitByPeriod?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  metrics?: Resolver<IResolversTypes['AccountMetrics'], ParentType, ContextType, RequireFields<IAccountMetricsArgs, 'input'>>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['AccountPermission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<IAccountProjectsArgs, 'after' | 'first'>>;
  slackInstallation?: Resolver<Maybe<IResolversTypes['SlackInstallation']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  subscriptionStatus?: Resolver<Maybe<IResolversTypes['AccountSubscriptionStatus']>, ParentType, ContextType>;
}>;

export type IAccountAvatarResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountAvatar'] = IResolversParentTypes['AccountAvatar']> = ResolversObject<{
  color?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  initial?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType, RequireFields<IAccountAvatarUrlArgs, 'size'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAccountBuildsMetricsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountBuildsMetrics'] = IResolversParentTypes['AccountBuildsMetrics']> = ResolversObject<{
  all?: Resolver<IResolversTypes['AccountMetricData'], ParentType, ContextType>;
  projects?: Resolver<Array<IResolversTypes['Project']>, ParentType, ContextType>;
  series?: Resolver<Array<IResolversTypes['AccountMetricDataPoint']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAccountMetricDataResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountMetricData'] = IResolversParentTypes['AccountMetricData']> = ResolversObject<{
  projects?: Resolver<IResolversTypes['JSONObject'], ParentType, ContextType>;
  total?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAccountMetricDataPointResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountMetricDataPoint'] = IResolversParentTypes['AccountMetricDataPoint']> = ResolversObject<{
  projects?: Resolver<IResolversTypes['JSONObject'], ParentType, ContextType>;
  total?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ts?: Resolver<IResolversTypes['Timestamp'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAccountMetricsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountMetrics'] = IResolversParentTypes['AccountMetrics']> = ResolversObject<{
  builds?: Resolver<IResolversTypes['AccountBuildsMetrics'], ParentType, ContextType>;
  screenshots?: Resolver<IResolversTypes['AccountScreenshotMetrics'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAccountScreenshotMetricsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountScreenshotMetrics'] = IResolversParentTypes['AccountScreenshotMetrics']> = ResolversObject<{
  all?: Resolver<IResolversTypes['AccountMetricData'], ParentType, ContextType>;
  projects?: Resolver<Array<IResolversTypes['Project']>, ParentType, ContextType>;
  series?: Resolver<Array<IResolversTypes['AccountMetricDataPoint']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAccountSubscriptionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountSubscription'] = IResolversParentTypes['AccountSubscription']> = ResolversObject<{
  currency?: Resolver<IResolversTypes['Currency'], ParentType, ContextType>;
  endDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  paymentMethodFilled?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  provider?: Resolver<IResolversTypes['AccountSubscriptionProvider'], ParentType, ContextType>;
  status?: Resolver<IResolversTypes['AccountSubscriptionStatus'], ParentType, ContextType>;
  trialDaysRemaining?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationActionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationAction'] = IResolversParentTypes['AutomationAction']> = ResolversObject<{
  action?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  actionPayload?: Resolver<IResolversTypes['JSONObject'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationActionRunResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationActionRun'] = IResolversParentTypes['AutomationActionRun']> = ResolversObject<{
  actionName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  completedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationActionSendSlackMessagePayloadResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationActionSendSlackMessagePayload'] = IResolversParentTypes['AutomationActionSendSlackMessagePayload']> = ResolversObject<{
  channelId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  slackId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationConditionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationCondition'] = IResolversParentTypes['AutomationCondition']> = ResolversObject<{
  type?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationConditionsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationConditions'] = IResolversParentTypes['AutomationConditions']> = ResolversObject<{
  all?: Resolver<Array<IResolversTypes['AutomationCondition']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationRuleResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationRule'] = IResolversParentTypes['AutomationRule']> = ResolversObject<{
  active?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  if?: Resolver<IResolversTypes['AutomationConditions'], ParentType, ContextType>;
  lastAutomationRun?: Resolver<Maybe<IResolversTypes['AutomationRun']>, ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  on?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  then?: Resolver<Array<IResolversTypes['AutomationAction']>, ParentType, ContextType>;
  updatedAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationRuleConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationRuleConnection'] = IResolversParentTypes['AutomationRuleConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['AutomationRule']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAutomationRunResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AutomationRun'] = IResolversParentTypes['AutomationRun']> = ResolversObject<{
  actionRuns?: Resolver<Array<IResolversTypes['AutomationActionRun']>, ParentType, ContextType>;
  buildId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  event?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<IResolversTypes['AutomationRunStatus'], ParentType, ContextType>;
  updatedAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Build'] = IResolversParentTypes['Build']> = ResolversObject<{
  baseBranch?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  baseBranchResolvedFrom?: Resolver<Maybe<IResolversTypes['BaseBranchResolution']>, ParentType, ContextType>;
  baseBuild?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType>;
  baseScreenshotBucket?: Resolver<Maybe<IResolversTypes['ScreenshotBucket']>, ParentType, ContextType>;
  branch?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  commit?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<IResolversTypes['BuildMetadata']>, ParentType, ContextType>;
  mode?: Resolver<IResolversTypes['BuildMode'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  number?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  parallel?: Resolver<Maybe<IResolversTypes['BuildParallel']>, ParentType, ContextType>;
  prHeadCommit?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  prNumber?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  pullRequest?: Resolver<Maybe<IResolversTypes['PullRequest']>, ParentType, ContextType>;
  reviews?: Resolver<Array<IResolversTypes['BuildReview']>, ParentType, ContextType>;
  screenshotDiffs?: Resolver<IResolversTypes['ScreenshotDiffConnection'], ParentType, ContextType, RequireFields<IBuildScreenshotDiffsArgs, 'after' | 'first'>>;
  stats?: Resolver<Maybe<IResolversTypes['BuildStats']>, ParentType, ContextType>;
  status?: Resolver<IResolversTypes['BuildStatus'], ParentType, ContextType>;
  type?: Resolver<Maybe<IResolversTypes['BuildType']>, ParentType, ContextType>;
  updatedAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['BuildConnection'] = IResolversParentTypes['BuildConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['Build']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildMetadataResolvers<ContextType = Context, ParentType extends IResolversParentTypes['BuildMetadata'] = IResolversParentTypes['BuildMetadata']> = ResolversObject<{
  testReport?: Resolver<Maybe<IResolversTypes['TestReport']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildParallelResolvers<ContextType = Context, ParentType extends IResolversParentTypes['BuildParallel'] = IResolversParentTypes['BuildParallel']> = ResolversObject<{
  nonce?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  received?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildReviewResolvers<ContextType = Context, ParentType extends IResolversParentTypes['BuildReview'] = IResolversParentTypes['BuildReview']> = ResolversObject<{
  date?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  state?: Resolver<IResolversTypes['BuildReviewState'], ParentType, ContextType>;
  user?: Resolver<Maybe<IResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildStatsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['BuildStats'] = IResolversParentTypes['BuildStats']> = ResolversObject<{
  added?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  changed?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  failure?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  removed?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  retryFailure?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  unchanged?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Connection'] = IResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'AutomationRuleConnection' | 'BuildConnection' | 'GhApiInstallationConnection' | 'GhApiRepositoryConnection' | 'GlApiNamespaceConnection' | 'GlApiProjectConnection' | 'ProjectConnection' | 'ProjectContributorConnection' | 'ScreenshotDiffConnection' | 'TeamGithubMemberConnection' | 'TeamMemberConnection' | 'TestChangesConnection' | 'UserConnection', ParentType, ContextType>;
  edges?: Resolver<Array<IResolversTypes['Node']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
}>;

export type ICreateTeamResultResolvers<ContextType = Context, ParentType extends IResolversParentTypes['CreateTeamResult'] = IResolversParentTypes['CreateTeamResult']> = ResolversObject<{
  redirectUrl?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  team?: Resolver<IResolversTypes['Team'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface IDateScalarConfig extends GraphQLScalarTypeConfig<IResolversTypes['Date'], any> {
  name: 'Date';
}

export interface IDateTimeScalarConfig extends GraphQLScalarTypeConfig<IResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type IGhApiInstallationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GhApiInstallation'] = IResolversParentTypes['GhApiInstallation']> = ResolversObject<{
  account?: Resolver<IResolversTypes['GhApiInstallationAccount'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGhApiInstallationAccountResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GhApiInstallationAccount'] = IResolversParentTypes['GhApiInstallationAccount']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  login?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGhApiInstallationConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GhApiInstallationConnection'] = IResolversParentTypes['GhApiInstallationConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['GhApiInstallation']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGhApiRepositoryResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GhApiRepository'] = IResolversParentTypes['GhApiRepository']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  owner_login?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  updated_at?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGhApiRepositoryConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GhApiRepositoryConnection'] = IResolversParentTypes['GhApiRepositoryConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['GhApiRepository']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGithubAccountResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GithubAccount'] = IResolversParentTypes['GithubAccount']> = ResolversObject<{
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  lastLoggedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  login?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGithubInstallationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GithubInstallation'] = IResolversParentTypes['GithubInstallation']> = ResolversObject<{
  ghAccount?: Resolver<Maybe<IResolversTypes['GhApiInstallationAccount']>, ParentType, ContextType>;
  ghInstallation?: Resolver<Maybe<IResolversTypes['GhApiInstallation']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGithubPullRequestResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GithubPullRequest'] = IResolversParentTypes['GithubPullRequest']> = ResolversObject<{
  closedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  creator?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  date?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  draft?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  merged?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType>;
  mergedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  number?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  state?: Resolver<Maybe<IResolversTypes['PullRequestState']>, ParentType, ContextType>;
  title?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGithubRepositoryResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GithubRepository'] = IResolversParentTypes['GithubRepository']> = ResolversObject<{
  defaultBranch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  private?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGitlabProjectResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GitlabProject'] = IResolversParentTypes['GitlabProject']> = ResolversObject<{
  defaultBranch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  private?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGitlabUserResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GitlabUser'] = IResolversParentTypes['GitlabUser']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  lastLoggedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  username?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGlApiNamespaceResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GlApiNamespace'] = IResolversParentTypes['GlApiNamespace']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  isProjectToken?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  kind?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  path?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGlApiNamespaceConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GlApiNamespaceConnection'] = IResolversParentTypes['GlApiNamespaceConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['GlApiNamespace']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGlApiProjectResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GlApiProject'] = IResolversParentTypes['GlApiProject']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  last_activity_at?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  namespace?: Resolver<IResolversTypes['GlApiNamespace'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGlApiProjectConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GlApiProjectConnection'] = IResolversParentTypes['GlApiProjectConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['GlApiProject']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGoogleUserResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GoogleUser'] = IResolversParentTypes['GoogleUser']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  lastLoggedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  primaryEmail?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface IJsonObjectScalarConfig extends GraphQLScalarTypeConfig<IResolversTypes['JSONObject'], any> {
  name: 'JSONObject';
}

export type IMutationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Mutation'] = IResolversParentTypes['Mutation']> = ResolversObject<{
  acceptInvitation?: Resolver<IResolversTypes['Team'], ParentType, ContextType, RequireFields<IMutationAcceptInvitationArgs, 'token'>>;
  addOrUpdateProjectContributor?: Resolver<IResolversTypes['ProjectContributor'], ParentType, ContextType, RequireFields<IMutationAddOrUpdateProjectContributorArgs, 'input'>>;
  createAutomationRule?: Resolver<IResolversTypes['AutomationRule'], ParentType, ContextType, RequireFields<IMutationCreateAutomationRuleArgs, 'input'>>;
  createTeam?: Resolver<IResolversTypes['CreateTeamResult'], ParentType, ContextType, RequireFields<IMutationCreateTeamArgs, 'input'>>;
  deactivateAutomationRule?: Resolver<IResolversTypes['AutomationRule'], ParentType, ContextType, RequireFields<IMutationDeactivateAutomationRuleArgs, 'id'>>;
  deleteProject?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationDeleteProjectArgs, 'id'>>;
  deleteTeam?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationDeleteTeamArgs, 'input'>>;
  disableGitHubSSOOnTeam?: Resolver<IResolversTypes['Team'], ParentType, ContextType, RequireFields<IMutationDisableGitHubSsoOnTeamArgs, 'input'>>;
  disconnectGitHubAuth?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationDisconnectGitHubAuthArgs, 'input'>>;
  disconnectGitLabAuth?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationDisconnectGitLabAuthArgs, 'input'>>;
  disconnectGoogleAuth?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationDisconnectGoogleAuthArgs, 'input'>>;
  enableGitHubSSOOnTeam?: Resolver<IResolversTypes['Team'], ParentType, ContextType, RequireFields<IMutationEnableGitHubSsoOnTeamArgs, 'input'>>;
  importGithubProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationImportGithubProjectArgs, 'input'>>;
  importGitlabProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationImportGitlabProjectArgs, 'input'>>;
  leaveTeam?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationLeaveTeamArgs, 'input'>>;
  linkGithubRepository?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationLinkGithubRepositoryArgs, 'input'>>;
  linkGitlabProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationLinkGitlabProjectArgs, 'input'>>;
  ping?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  regenerateProjectToken?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationRegenerateProjectTokenArgs, 'id'>>;
  removeContributorFromProject?: Resolver<IResolversTypes['RemoveContributorFromProjectPayload'], ParentType, ContextType, RequireFields<IMutationRemoveContributorFromProjectArgs, 'input'>>;
  removeUserFromTeam?: Resolver<IResolversTypes['RemoveUserFromTeamPayload'], ParentType, ContextType, RequireFields<IMutationRemoveUserFromTeamArgs, 'input'>>;
  setTeamDefaultUserLevel?: Resolver<IResolversTypes['Team'], ParentType, ContextType, RequireFields<IMutationSetTeamDefaultUserLevelArgs, 'input'>>;
  setTeamMemberLevel?: Resolver<IResolversTypes['TeamMember'], ParentType, ContextType, RequireFields<IMutationSetTeamMemberLevelArgs, 'input'>>;
  setValidationStatus?: Resolver<IResolversTypes['Build'], ParentType, ContextType, RequireFields<IMutationSetValidationStatusArgs, 'buildId' | 'validationStatus'>>;
  testAutomation?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationTestAutomationArgs, 'input'>>;
  transferProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationTransferProjectArgs, 'input'>>;
  uninstallSlack?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationUninstallSlackArgs, 'input'>>;
  unlinkGithubRepository?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUnlinkGithubRepositoryArgs, 'input'>>;
  unlinkGitlabProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUnlinkGitlabProjectArgs, 'input'>>;
  updateAccount?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationUpdateAccountArgs, 'input'>>;
  updateAutomationRule?: Resolver<IResolversTypes['AutomationRule'], ParentType, ContextType, RequireFields<IMutationUpdateAutomationRuleArgs, 'input'>>;
  updateProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUpdateProjectArgs, 'input'>>;
  updateProjectPrComment?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUpdateProjectPrCommentArgs, 'input'>>;
}>;

export type INodeResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Node'] = IResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'AccountSubscription' | 'AutomationActionRun' | 'AutomationRule' | 'AutomationRun' | 'Build' | 'BuildReview' | 'GhApiInstallation' | 'GhApiInstallationAccount' | 'GhApiRepository' | 'GithubAccount' | 'GithubInstallation' | 'GithubPullRequest' | 'GithubRepository' | 'GitlabProject' | 'GitlabUser' | 'GlApiNamespace' | 'GlApiProject' | 'GoogleUser' | 'Plan' | 'Project' | 'ProjectContributor' | 'Screenshot' | 'ScreenshotBucket' | 'ScreenshotDiff' | 'SlackInstallation' | 'Team' | 'TeamGithubMember' | 'TeamMember' | 'Test' | 'TestChange' | 'User', ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
}>;

export type IPageInfoResolvers<ContextType = Context, ParentType extends IResolversParentTypes['PageInfo'] = IResolversParentTypes['PageInfo']> = ResolversObject<{
  hasNextPage?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IPlanResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Plan'] = IResolversParentTypes['Plan']> = ResolversObject<{
  displayName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  fineGrainedAccessControlIncluded?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  githubSsoIncluded?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  usageBased?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Project'] = IResolversParentTypes['Project']> = ResolversObject<{
  account?: Resolver<IResolversTypes['Account'], ParentType, ContextType>;
  autoApprovedBranchGlob?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  automationRules?: Resolver<IResolversTypes['AutomationRuleConnection'], ParentType, ContextType, RequireFields<IProjectAutomationRulesArgs, 'after' | 'first'>>;
  build?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType, RequireFields<IProjectBuildArgs, 'number'>>;
  buildNames?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  builds?: Resolver<IResolversTypes['BuildConnection'], ParentType, ContextType, RequireFields<IProjectBuildsArgs, 'after' | 'first'>>;
  contributors?: Resolver<IResolversTypes['ProjectContributorConnection'], ParentType, ContextType, RequireFields<IProjectContributorsArgs, 'after' | 'first'>>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  customAutoApprovedBranchGlob?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  customDefaultBaseBranch?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  defaultBaseBranch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  defaultUserLevel?: Resolver<Maybe<IResolversTypes['ProjectUserLevel']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  latestAutoApprovedBuild?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType>;
  latestBuild?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['ProjectPermission']>, ParentType, ContextType>;
  prCommentEnabled?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  private?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType>;
  public?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  repository?: Resolver<Maybe<IResolversTypes['Repository']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  summaryCheck?: Resolver<IResolversTypes['SummaryCheck'], ParentType, ContextType>;
  test?: Resolver<Maybe<IResolversTypes['Test']>, ParentType, ContextType, RequireFields<IProjectTestArgs, 'id'>>;
  token?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  totalScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ProjectConnection'] = IResolversParentTypes['ProjectConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['Project']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectContributorResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ProjectContributor'] = IResolversParentTypes['ProjectContributor']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  level?: Resolver<IResolversTypes['ProjectUserLevel'], ParentType, ContextType>;
  project?: Resolver<IResolversTypes['Project'], ParentType, ContextType>;
  user?: Resolver<IResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectContributorConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ProjectContributorConnection'] = IResolversParentTypes['ProjectContributorConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['ProjectContributor']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IPullRequestResolvers<ContextType = Context, ParentType extends IResolversParentTypes['PullRequest'] = IResolversParentTypes['PullRequest']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GithubPullRequest', ParentType, ContextType>;
  closedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  date?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  draft?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  merged?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType>;
  mergedAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  number?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  state?: Resolver<Maybe<IResolversTypes['PullRequestState']>, ParentType, ContextType>;
  title?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
}>;

export type IQueryResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Query'] = IResolversParentTypes['Query']> = ResolversObject<{
  account?: Resolver<Maybe<IResolversTypes['Account']>, ParentType, ContextType, RequireFields<IQueryAccountArgs, 'slug'>>;
  accountById?: Resolver<Maybe<IResolversTypes['Account']>, ParentType, ContextType, RequireFields<IQueryAccountByIdArgs, 'id'>>;
  automationRule?: Resolver<Maybe<IResolversTypes['AutomationRule']>, ParentType, ContextType, RequireFields<IQueryAutomationRuleArgs, 'id'>>;
  ghApiInstallationRepositories?: Resolver<IResolversTypes['GhApiRepositoryConnection'], ParentType, ContextType, RequireFields<IQueryGhApiInstallationRepositoriesArgs, 'fromAuthUser' | 'installationId' | 'page'>>;
  glApiProjects?: Resolver<IResolversTypes['GlApiProjectConnection'], ParentType, ContextType, RequireFields<IQueryGlApiProjectsArgs, 'accountId' | 'allProjects' | 'page'>>;
  invitation?: Resolver<Maybe<IResolversTypes['Team']>, ParentType, ContextType, RequireFields<IQueryInvitationArgs, 'token'>>;
  me?: Resolver<Maybe<IResolversTypes['User']>, ParentType, ContextType>;
  ping?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  project?: Resolver<Maybe<IResolversTypes['Project']>, ParentType, ContextType, RequireFields<IQueryProjectArgs, 'accountSlug' | 'projectName'>>;
  projectById?: Resolver<Maybe<IResolversTypes['Project']>, ParentType, ContextType, RequireFields<IQueryProjectByIdArgs, 'id'>>;
  teamById?: Resolver<Maybe<IResolversTypes['Team']>, ParentType, ContextType, RequireFields<IQueryTeamByIdArgs, 'id'>>;
}>;

export type IRemoveContributorFromProjectPayloadResolvers<ContextType = Context, ParentType extends IResolversParentTypes['RemoveContributorFromProjectPayload'] = IResolversParentTypes['RemoveContributorFromProjectPayload']> = ResolversObject<{
  projectContributorId?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IRemoveUserFromTeamPayloadResolvers<ContextType = Context, ParentType extends IResolversParentTypes['RemoveUserFromTeamPayload'] = IResolversParentTypes['RemoveUserFromTeamPayload']> = ResolversObject<{
  teamMemberId?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IRepositoryResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Repository'] = IResolversParentTypes['Repository']> = ResolversObject<{
  __resolveType: TypeResolveFn<'GithubRepository' | 'GitlabProject', ParentType, ContextType>;
  defaultBranch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  private?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
}>;

export type IScreenshotResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Screenshot'] = IResolversParentTypes['Screenshot']> = ResolversObject<{
  height?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<IResolversTypes['ScreenshotMetadata']>, ParentType, ContextType>;
  originalUrl?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  playwrightTraceUrl?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  width?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotBucketResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotBucket'] = IResolversParentTypes['ScreenshotBucket']> = ResolversObject<{
  branch?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  commit?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotDiffResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotDiff'] = IResolversParentTypes['ScreenshotDiff']> = ResolversObject<{
  baseScreenshot?: Resolver<Maybe<IResolversTypes['Screenshot']>, ParentType, ContextType>;
  build?: Resolver<IResolversTypes['Build'], ParentType, ContextType>;
  changeId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  compareScreenshot?: Resolver<Maybe<IResolversTypes['Screenshot']>, ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  group?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  height?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  last7daysOccurences?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<IResolversTypes['ScreenshotDiffStatus'], ParentType, ContextType>;
  test?: Resolver<Maybe<IResolversTypes['Test']>, ParentType, ContextType>;
  threshold?: Resolver<Maybe<IResolversTypes['Float']>, ParentType, ContextType>;
  url?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  variantKey?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  width?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotDiffConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotDiffConnection'] = IResolversParentTypes['ScreenshotDiffConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['ScreenshotDiff']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadata'] = IResolversParentTypes['ScreenshotMetadata']> = ResolversObject<{
  automationLibrary?: Resolver<IResolversTypes['ScreenshotMetadataAutomationLibrary'], ParentType, ContextType>;
  browser?: Resolver<Maybe<IResolversTypes['ScreenshotMetadataBrowser']>, ParentType, ContextType>;
  colorScheme?: Resolver<Maybe<IResolversTypes['ScreenshotMetadataColorScheme']>, ParentType, ContextType>;
  mediaType?: Resolver<Maybe<IResolversTypes['ScreenshotMetadataMediaType']>, ParentType, ContextType>;
  previewUrl?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  sdk?: Resolver<IResolversTypes['ScreenshotMetadataSDK'], ParentType, ContextType>;
  test?: Resolver<Maybe<IResolversTypes['ScreenshotMetadataTest']>, ParentType, ContextType>;
  url?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  viewport?: Resolver<Maybe<IResolversTypes['ScreenshotMetadataViewport']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataAutomationLibraryResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadataAutomationLibrary'] = IResolversParentTypes['ScreenshotMetadataAutomationLibrary']> = ResolversObject<{
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataBrowserResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadataBrowser'] = IResolversParentTypes['ScreenshotMetadataBrowser']> = ResolversObject<{
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataLocationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadataLocation'] = IResolversParentTypes['ScreenshotMetadataLocation']> = ResolversObject<{
  column?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  file?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  line?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataSdkResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadataSDK'] = IResolversParentTypes['ScreenshotMetadataSDK']> = ResolversObject<{
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  version?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataTestResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadataTest'] = IResolversParentTypes['ScreenshotMetadataTest']> = ResolversObject<{
  id?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<IResolversTypes['ScreenshotMetadataLocation']>, ParentType, ContextType>;
  repeat?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  retries?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  retry?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  title?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  titlePath?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataViewportResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadataViewport'] = IResolversParentTypes['ScreenshotMetadataViewport']> = ResolversObject<{
  height?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  width?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ISlackInstallationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['SlackInstallation'] = IResolversParentTypes['SlackInstallation']> = ResolversObject<{
  connectedAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  isUpToDate?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  teamDomain?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  teamName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITeamResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Team'] = IResolversParentTypes['Team']> = ResolversObject<{
  additionalScreenshotsCost?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  blockWhenSpendLimitIsReached?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  consumptionRatio?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  defaultUserLevel?: Resolver<IResolversTypes['TeamDefaultUserLevel'], ParentType, ContextType>;
  githubAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  githubLightInstallation?: Resolver<Maybe<IResolversTypes['GithubInstallation']>, ParentType, ContextType>;
  githubMembers?: Resolver<Maybe<IResolversTypes['TeamGithubMemberConnection']>, ParentType, ContextType, RequireFields<ITeamGithubMembersArgs, 'after' | 'first'>>;
  gitlabAccessToken?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  gitlabBaseUrl?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  glNamespaces?: Resolver<Maybe<IResolversTypes['GlApiNamespaceConnection']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  includedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  inviteLink?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  me?: Resolver<Maybe<IResolversTypes['TeamMember']>, ParentType, ContextType>;
  members?: Resolver<IResolversTypes['TeamMemberConnection'], ParentType, ContextType, RequireFields<ITeamMembersArgs, 'after' | 'first'>>;
  meteredSpendLimitByPeriod?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  metrics?: Resolver<IResolversTypes['AccountMetrics'], ParentType, ContextType, RequireFields<ITeamMetricsArgs, 'input'>>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  oldPaidSubscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['AccountPermission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<ITeamProjectsArgs, 'after' | 'first'>>;
  slackInstallation?: Resolver<Maybe<IResolversTypes['SlackInstallation']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  ssoGithubAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  subscriptionStatus?: Resolver<Maybe<IResolversTypes['AccountSubscriptionStatus']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITeamGithubMemberResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TeamGithubMember'] = IResolversParentTypes['TeamGithubMember']> = ResolversObject<{
  githubAccount?: Resolver<IResolversTypes['GithubAccount'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  teamMember?: Resolver<Maybe<IResolversTypes['TeamMember']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITeamGithubMemberConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TeamGithubMemberConnection'] = IResolversParentTypes['TeamGithubMemberConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['TeamGithubMember']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITeamMemberResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TeamMember'] = IResolversParentTypes['TeamMember']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  level?: Resolver<IResolversTypes['TeamUserLevel'], ParentType, ContextType>;
  user?: Resolver<IResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITeamMemberConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TeamMemberConnection'] = IResolversParentTypes['TeamMemberConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['TeamMember']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Test'] = IResolversParentTypes['Test']> = ResolversObject<{
  changes?: Resolver<IResolversTypes['TestChangesConnection'], ParentType, ContextType, RequireFields<ITestChangesArgs, 'after' | 'first' | 'period'>>;
  firstSeenDiff?: Resolver<Maybe<IResolversTypes['ScreenshotDiff']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  lastSeenDiff?: Resolver<Maybe<IResolversTypes['ScreenshotDiff']>, ParentType, ContextType>;
  metrics?: Resolver<IResolversTypes['TestMetrics'], ParentType, ContextType, Partial<ITestMetricsArgs>>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<IResolversTypes['TestStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestChangeResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestChange'] = IResolversParentTypes['TestChange']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  stats?: Resolver<IResolversTypes['TestChangeStats'], ParentType, ContextType, RequireFields<ITestChangeStatsArgs, 'period'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestChangeStatsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestChangeStats'] = IResolversParentTypes['TestChangeStats']> = ResolversObject<{
  firstSeenDiff?: Resolver<IResolversTypes['ScreenshotDiff'], ParentType, ContextType>;
  lastSeenDiff?: Resolver<IResolversTypes['ScreenshotDiff'], ParentType, ContextType>;
  totalOccurences?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestChangesConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestChangesConnection'] = IResolversParentTypes['TestChangesConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['TestChange']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestMetricDataResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestMetricData'] = IResolversParentTypes['TestMetricData']> = ResolversObject<{
  changes?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  consistency?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  flakiness?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  stability?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  total?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  uniqueChanges?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestMetricDataPointResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestMetricDataPoint'] = IResolversParentTypes['TestMetricDataPoint']> = ResolversObject<{
  changes?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ts?: Resolver<IResolversTypes['Timestamp'], ParentType, ContextType>;
  uniqueChanges?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestMetricsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestMetrics'] = IResolversParentTypes['TestMetrics']> = ResolversObject<{
  all?: Resolver<IResolversTypes['TestMetricData'], ParentType, ContextType>;
  series?: Resolver<Array<IResolversTypes['TestMetricDataPoint']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestReportResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestReport'] = IResolversParentTypes['TestReport']> = ResolversObject<{
  stats?: Resolver<Maybe<IResolversTypes['TestReportStats']>, ParentType, ContextType>;
  status?: Resolver<IResolversTypes['TestReportStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestReportStatsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestReportStats'] = IResolversParentTypes['TestReportStats']> = ResolversObject<{
  duration?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  startTime?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ITimeScalarConfig extends GraphQLScalarTypeConfig<IResolversTypes['Time'], any> {
  name: 'Time';
}

export interface ITimestampScalarConfig extends GraphQLScalarTypeConfig<IResolversTypes['Timestamp'], any> {
  name: 'Timestamp';
}

export type IUserResolvers<ContextType = Context, ParentType extends IResolversParentTypes['User'] = IResolversParentTypes['User']> = ResolversObject<{
  additionalScreenshotsCost?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  blockWhenSpendLimitIsReached?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  consumptionRatio?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  email?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  ghInstallations?: Resolver<IResolversTypes['GhApiInstallationConnection'], ParentType, ContextType>;
  githubAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  gitlabAccessToken?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  gitlabBaseUrl?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  gitlabUser?: Resolver<Maybe<IResolversTypes['GitlabUser']>, ParentType, ContextType>;
  glNamespaces?: Resolver<Maybe<IResolversTypes['GlApiNamespaceConnection']>, ParentType, ContextType>;
  googleUser?: Resolver<Maybe<IResolversTypes['GoogleUser']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasSubscribedToTrial?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  includedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  lastSubscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  meteredSpendLimitByPeriod?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  metrics?: Resolver<IResolversTypes['AccountMetrics'], ParentType, ContextType, RequireFields<IUserMetricsArgs, 'input'>>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  oldPaidSubscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['AccountPermission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<IUserProjectsArgs, 'after' | 'first'>>;
  projectsContributedOn?: Resolver<IResolversTypes['ProjectContributorConnection'], ParentType, ContextType, RequireFields<IUserProjectsContributedOnArgs, 'after' | 'first' | 'projectId'>>;
  slackInstallation?: Resolver<Maybe<IResolversTypes['SlackInstallation']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  subscriptionStatus?: Resolver<Maybe<IResolversTypes['AccountSubscriptionStatus']>, ParentType, ContextType>;
  teams?: Resolver<Array<IResolversTypes['Team']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IUserConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['UserConnection'] = IResolversParentTypes['UserConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['User']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IResolvers<ContextType = Context> = ResolversObject<{
  Account?: IAccountResolvers<ContextType>;
  AccountAvatar?: IAccountAvatarResolvers<ContextType>;
  AccountBuildsMetrics?: IAccountBuildsMetricsResolvers<ContextType>;
  AccountMetricData?: IAccountMetricDataResolvers<ContextType>;
  AccountMetricDataPoint?: IAccountMetricDataPointResolvers<ContextType>;
  AccountMetrics?: IAccountMetricsResolvers<ContextType>;
  AccountScreenshotMetrics?: IAccountScreenshotMetricsResolvers<ContextType>;
  AccountSubscription?: IAccountSubscriptionResolvers<ContextType>;
  AutomationAction?: IAutomationActionResolvers<ContextType>;
  AutomationActionRun?: IAutomationActionRunResolvers<ContextType>;
  AutomationActionSendSlackMessagePayload?: IAutomationActionSendSlackMessagePayloadResolvers<ContextType>;
  AutomationCondition?: IAutomationConditionResolvers<ContextType>;
  AutomationConditions?: IAutomationConditionsResolvers<ContextType>;
  AutomationRule?: IAutomationRuleResolvers<ContextType>;
  AutomationRuleConnection?: IAutomationRuleConnectionResolvers<ContextType>;
  AutomationRun?: IAutomationRunResolvers<ContextType>;
  Build?: IBuildResolvers<ContextType>;
  BuildConnection?: IBuildConnectionResolvers<ContextType>;
  BuildMetadata?: IBuildMetadataResolvers<ContextType>;
  BuildParallel?: IBuildParallelResolvers<ContextType>;
  BuildReview?: IBuildReviewResolvers<ContextType>;
  BuildStats?: IBuildStatsResolvers<ContextType>;
  Connection?: IConnectionResolvers<ContextType>;
  CreateTeamResult?: ICreateTeamResultResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  GhApiInstallation?: IGhApiInstallationResolvers<ContextType>;
  GhApiInstallationAccount?: IGhApiInstallationAccountResolvers<ContextType>;
  GhApiInstallationConnection?: IGhApiInstallationConnectionResolvers<ContextType>;
  GhApiRepository?: IGhApiRepositoryResolvers<ContextType>;
  GhApiRepositoryConnection?: IGhApiRepositoryConnectionResolvers<ContextType>;
  GithubAccount?: IGithubAccountResolvers<ContextType>;
  GithubInstallation?: IGithubInstallationResolvers<ContextType>;
  GithubPullRequest?: IGithubPullRequestResolvers<ContextType>;
  GithubRepository?: IGithubRepositoryResolvers<ContextType>;
  GitlabProject?: IGitlabProjectResolvers<ContextType>;
  GitlabUser?: IGitlabUserResolvers<ContextType>;
  GlApiNamespace?: IGlApiNamespaceResolvers<ContextType>;
  GlApiNamespaceConnection?: IGlApiNamespaceConnectionResolvers<ContextType>;
  GlApiProject?: IGlApiProjectResolvers<ContextType>;
  GlApiProjectConnection?: IGlApiProjectConnectionResolvers<ContextType>;
  GoogleUser?: IGoogleUserResolvers<ContextType>;
  JSONObject?: GraphQLScalarType;
  Mutation?: IMutationResolvers<ContextType>;
  Node?: INodeResolvers<ContextType>;
  PageInfo?: IPageInfoResolvers<ContextType>;
  Plan?: IPlanResolvers<ContextType>;
  Project?: IProjectResolvers<ContextType>;
  ProjectConnection?: IProjectConnectionResolvers<ContextType>;
  ProjectContributor?: IProjectContributorResolvers<ContextType>;
  ProjectContributorConnection?: IProjectContributorConnectionResolvers<ContextType>;
  PullRequest?: IPullRequestResolvers<ContextType>;
  Query?: IQueryResolvers<ContextType>;
  RemoveContributorFromProjectPayload?: IRemoveContributorFromProjectPayloadResolvers<ContextType>;
  RemoveUserFromTeamPayload?: IRemoveUserFromTeamPayloadResolvers<ContextType>;
  Repository?: IRepositoryResolvers<ContextType>;
  Screenshot?: IScreenshotResolvers<ContextType>;
  ScreenshotBucket?: IScreenshotBucketResolvers<ContextType>;
  ScreenshotDiff?: IScreenshotDiffResolvers<ContextType>;
  ScreenshotDiffConnection?: IScreenshotDiffConnectionResolvers<ContextType>;
  ScreenshotMetadata?: IScreenshotMetadataResolvers<ContextType>;
  ScreenshotMetadataAutomationLibrary?: IScreenshotMetadataAutomationLibraryResolvers<ContextType>;
  ScreenshotMetadataBrowser?: IScreenshotMetadataBrowserResolvers<ContextType>;
  ScreenshotMetadataLocation?: IScreenshotMetadataLocationResolvers<ContextType>;
  ScreenshotMetadataSDK?: IScreenshotMetadataSdkResolvers<ContextType>;
  ScreenshotMetadataTest?: IScreenshotMetadataTestResolvers<ContextType>;
  ScreenshotMetadataViewport?: IScreenshotMetadataViewportResolvers<ContextType>;
  SlackInstallation?: ISlackInstallationResolvers<ContextType>;
  Team?: ITeamResolvers<ContextType>;
  TeamGithubMember?: ITeamGithubMemberResolvers<ContextType>;
  TeamGithubMemberConnection?: ITeamGithubMemberConnectionResolvers<ContextType>;
  TeamMember?: ITeamMemberResolvers<ContextType>;
  TeamMemberConnection?: ITeamMemberConnectionResolvers<ContextType>;
  Test?: ITestResolvers<ContextType>;
  TestChange?: ITestChangeResolvers<ContextType>;
  TestChangeStats?: ITestChangeStatsResolvers<ContextType>;
  TestChangesConnection?: ITestChangesConnectionResolvers<ContextType>;
  TestMetricData?: ITestMetricDataResolvers<ContextType>;
  TestMetricDataPoint?: ITestMetricDataPointResolvers<ContextType>;
  TestMetrics?: ITestMetricsResolvers<ContextType>;
  TestReport?: ITestReportResolvers<ContextType>;
  TestReportStats?: ITestReportStatsResolvers<ContextType>;
  Time?: GraphQLScalarType;
  Timestamp?: GraphQLScalarType;
  User?: IUserResolvers<ContextType>;
  UserConnection?: IUserConnectionResolvers<ContextType>;
}>;

