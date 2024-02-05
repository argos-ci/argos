import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { AccountAvatar, Subscription, Build, GithubAccount, GithubPullRequest, GithubRepository, GitlabProject, Plan, Screenshot, ScreenshotBucket, ScreenshotDiff, Project, Account, TeamUser, Test, VercelConfiguration, VercelProject } from '../../database/models/index.js';
import type { GhApiInstallation, GhApiRepository } from '../../github/index.js';
import type { GlApiNamespace, GlApiProject } from '../../gitlab/index.js';
import type { VercelApiProject, VercelApiTeam } from '../../vercel/index.js';
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
  Date: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  Time: { input: any; output: any; }
};

export type IAccount = {
  avatar: IAccountAvatar;
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  ghAccount?: Maybe<IGithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<IGlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasPaidPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  name?: Maybe<Scalars['String']['output']>;
  paymentProvider?: Maybe<IAccountSubscriptionProvider>;
  pendingCancelAt?: Maybe<Scalars['DateTime']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<IPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<IAccountSubscription>;
  subscriptionStatus?: Maybe<IAccountSubscriptionStatus>;
  trialStatus?: Maybe<ITrialStatus>;
  vercelConfiguration?: Maybe<IVercelConfiguration>;
};


export type IAccountProjectsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
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

export type IAccountSubscription = INode & {
  __typename?: 'AccountSubscription';
  id: Scalars['ID']['output'];
  paymentMethodFilled: Scalars['Boolean']['output'];
  provider: IAccountSubscriptionProvider;
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
  /** Ongoing trial */
  Trialing = 'trialing',
  /** Unpaid */
  Unpaid = 'unpaid'
}

export type IBuild = INode & {
  __typename?: 'Build';
  /** The screenshot bucket of the baselineBranch */
  baseScreenshotBucket?: Maybe<IScreenshotBucket>;
  /** Received batch count  */
  batchCount?: Maybe<Scalars['Int']['output']>;
  /** Branch */
  branch: Scalars['String']['output'];
  /** Commit */
  commit: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Build name */
  name: Scalars['String']['output'];
  /** Continuous number. It is incremented after each build */
  number: Scalars['Int']['output'];
  /** Pull request head commit */
  prHeadCommit?: Maybe<Scalars['String']['output']>;
  /** Pull request number */
  prNumber?: Maybe<Scalars['Int']['output']>;
  /** Pull request */
  pullRequest?: Maybe<IPullRequest>;
  /** The screenshot diffs between the base screenshot bucket of the compare screenshot bucket */
  screenshotDiffs: IScreenshotDiffConnection;
  /** Build stats */
  stats: IBuildStats;
  /** Review status, conclusion or job status */
  status: IBuildStatus;
  /** Expected batch count */
  totalBatch?: Maybe<Scalars['Int']['output']>;
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

export type IBuildStats = {
  __typename?: 'BuildStats';
  added: Scalars['Int']['output'];
  changed: Scalars['Int']['output'];
  failure: Scalars['Int']['output'];
  removed: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  unchanged: Scalars['Int']['output'];
};

export enum IBuildStatus {
  /** job status: aborted */
  Aborted = 'aborted',
  /** reviewStatus: accepted */
  Accepted = 'accepted',
  /** conclusion: diffDetected */
  DiffDetected = 'diffDetected',
  /** job status: complete */
  Error = 'error',
  /** job status: expired */
  Expired = 'expired',
  /** job status: pending */
  Pending = 'pending',
  /** job status: progress */
  Progress = 'progress',
  /** reviewStatus: rejected */
  Rejected = 'rejected',
  /** conclusion: stable */
  Stable = 'stable'
}

export enum IBuildType {
  /** Comparison build */
  Check = 'check',
  /** No reference build to compare */
  Orphan = 'orphan',
  /** Build on reference branch */
  Reference = 'reference'
}

export type IConnection = {
  edges: Array<INode>;
  pageInfo: IPageInfo;
};

export type ICreateTeamInput = {
  name: Scalars['String']['input'];
};

export type ICreateTeamResult = {
  __typename?: 'CreateTeamResult';
  redirectUrl: Scalars['String']['output'];
  team: ITeam;
};

export type IDeleteTeamInput = {
  accountId: Scalars['ID']['input'];
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

export type IGithubAccount = INode & {
  __typename?: 'GithubAccount';
  id: Scalars['ID']['output'];
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
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

export type IGlApiNamespace = INode & {
  __typename?: 'GlApiNamespace';
  id: Scalars['ID']['output'];
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

export type IImportGithubProjectInput = {
  accountSlug: Scalars['String']['input'];
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
  owner: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  repo: Scalars['String']['input'];
};

export type ILinkGitlabProjectInput = {
  gitlabProjectId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type ILinkVercelProjectInput = {
  configurationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  vercelProjectId: Scalars['ID']['input'];
};

export type IMutation = {
  __typename?: 'Mutation';
  /** Accept an invitation to join a team */
  acceptInvitation: ITeam;
  /** Create a team */
  createTeam: ICreateTeamResult;
  /** Delete Project */
  deleteProject: Scalars['Boolean']['output'];
  /** Delete team and all its projects */
  deleteTeam: Scalars['Boolean']['output'];
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
  /** Link Vercel project */
  linkVercelProject: IProject;
  /** Mute or unmute tests */
  muteTests: IMuteUpdateTest;
  ping: Scalars['Boolean']['output'];
  /** Remove a user from a team */
  removeUserFromTeam: IRemoveUserFromTeamPayload;
  /** Retrieve a Vercel API token from a code */
  retrieveVercelToken: IVercelApiToken;
  /** Set member level */
  setTeamMemberLevel: ITeamMember;
  /** Change the validationStatus on a build */
  setValidationStatus: IBuild;
  /** Finish the Vercel integration setup */
  setupVercelIntegration?: Maybe<Scalars['Boolean']['output']>;
  /** Terminate trial early */
  terminateTrial: IAccount;
  /** Transfer Project to another account */
  transferProject: IProject;
  /** Unlink GitHub Repository */
  unlinkGithubRepository: IProject;
  /** Unlink Gitlab Project */
  unlinkGitlabProject: IProject;
  /** Unlink Vercel project */
  unlinkVercelProject: IProject;
  /** Update Account */
  updateAccount: IAccount;
  /** Update Project */
  updateProject: IProject;
  /** Set project pull request comment */
  updateProjectPrComment: IProject;
  /** Update test statuses */
  updateTestStatuses: IUpdatedTestStatuses;
};


export type IMutationAcceptInvitationArgs = {
  token: Scalars['String']['input'];
};


export type IMutationCreateTeamArgs = {
  input: ICreateTeamInput;
};


export type IMutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type IMutationDeleteTeamArgs = {
  input: IDeleteTeamInput;
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


export type IMutationLinkVercelProjectArgs = {
  input: ILinkVercelProjectInput;
};


export type IMutationMuteTestsArgs = {
  ids: Array<Scalars['String']['input']>;
  muteUntil?: InputMaybe<Scalars['String']['input']>;
  muted: Scalars['Boolean']['input'];
};


export type IMutationRemoveUserFromTeamArgs = {
  input: IRemoveUserFromTeamInput;
};


export type IMutationRetrieveVercelTokenArgs = {
  code: Scalars['String']['input'];
};


export type IMutationSetTeamMemberLevelArgs = {
  input: ISetTeamMemberLevelInput;
};


export type IMutationSetValidationStatusArgs = {
  buildId: Scalars['ID']['input'];
  validationStatus: IValidationStatus;
};


export type IMutationSetupVercelIntegrationArgs = {
  input: ISetupVercelIntegrationInput;
};


export type IMutationTerminateTrialArgs = {
  accountId: Scalars['ID']['input'];
};


export type IMutationTransferProjectArgs = {
  input: ITransferProjectInput;
};


export type IMutationUnlinkGithubRepositoryArgs = {
  input: IUnlinkGithubRepositoryInput;
};


export type IMutationUnlinkGitlabProjectArgs = {
  input: IUnlinkGitlabProjectInput;
};


export type IMutationUnlinkVercelProjectArgs = {
  input: IUnlinkVercelProjectInput;
};


export type IMutationUpdateAccountArgs = {
  input: IUpdateAccountInput;
};


export type IMutationUpdateProjectArgs = {
  input: IUpdateProjectInput;
};


export type IMutationUpdateProjectPrCommentArgs = {
  input: IUpdateProjectPrCommentInput;
};


export type IMutationUpdateTestStatusesArgs = {
  ids: Array<Scalars['String']['input']>;
  status: ITestStatus;
};

export type IMuteUpdateTest = {
  __typename?: 'MuteUpdateTest';
  ids: Array<Scalars['String']['output']>;
  mute: Scalars['Boolean']['output'];
  muteUntil?: Maybe<Scalars['String']['output']>;
};

export type INode = {
  id: Scalars['ID']['output'];
};

export type IPageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export enum IPermission {
  Read = 'read',
  Write = 'write'
}

export type IPlan = INode & {
  __typename?: 'Plan';
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  usageBased: Scalars['Boolean']['output'];
};

export type IProject = INode & {
  __typename?: 'Project';
  /** Owner of the repository */
  account: IAccount;
  /** Override branch name */
  baselineBranch?: Maybe<Scalars['String']['output']>;
  /** A single build linked to the repository */
  build?: Maybe<IBuild>;
  /** Build names */
  buildNames: Array<Scalars['String']['output']>;
  /** Builds associated to the repository */
  builds: IBuildConnection;
  /** Current month used screenshots */
  currentPeriodScreenshots: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** Latest build */
  latestBuild?: Maybe<IBuild>;
  /** Reference build */
  latestReferenceBuild?: Maybe<IBuild>;
  name: Scalars['String']['output'];
  /** Determine if the current user has write access to the project */
  permissions: Array<IPermission>;
  /** Pull request comment enabled */
  prCommentEnabled: Scalars['Boolean']['output'];
  /** Override repository's Github privacy */
  private?: Maybe<Scalars['Boolean']['output']>;
  /** Check if the project is public or not */
  public: Scalars['Boolean']['output'];
  /** Reference branch */
  referenceBranch: Scalars['String']['output'];
  /** Repository associated to the project */
  repository?: Maybe<IRepository>;
  /** Project slug */
  slug: Scalars['String']['output'];
  /** Summary check */
  summaryCheck: ISummaryCheck;
  /** Tests associated to the repository */
  tests: ITestConnection;
  token?: Maybe<Scalars['String']['output']>;
  /** Total screenshots used */
  totalScreenshots: Scalars['Int']['output'];
  /** Vercel project */
  vercelProject?: Maybe<IVercelProject>;
};


export type IProjectBuildArgs = {
  number: Scalars['Int']['input'];
};


export type IProjectBuildsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  buildName?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type IProjectTestsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
};

export type IProjectConnection = IConnection & {
  __typename?: 'ProjectConnection';
  edges: Array<IProject>;
  pageInfo: IPageInfo;
};

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
  /** Get Vercel projects from API */
  vercelApiProjects: IVercelApiProjectConnection;
  /** Get a Vercel Team From API */
  vercelApiTeam?: Maybe<IVercelApiTeam>;
};


export type IQueryAccountArgs = {
  slug: Scalars['String']['input'];
};


export type IQueryAccountByIdArgs = {
  id: Scalars['ID']['input'];
};


export type IQueryGhApiInstallationRepositoriesArgs = {
  installationId: Scalars['ID']['input'];
  page: Scalars['Int']['input'];
  reposPerPage?: InputMaybe<Scalars['Int']['input']>;
};


export type IQueryGlApiProjectsArgs = {
  accessToken: Scalars['String']['input'];
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
  buildName?: InputMaybe<Scalars['String']['input']>;
  projectName: Scalars['String']['input'];
};


export type IQueryProjectByIdArgs = {
  id: Scalars['ID']['input'];
};


export type IQueryTeamByIdArgs = {
  id: Scalars['ID']['input'];
};


export type IQueryVercelApiProjectsArgs = {
  accessToken: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  teamId?: InputMaybe<Scalars['ID']['input']>;
};


export type IQueryVercelApiTeamArgs = {
  accessToken: Scalars['String']['input'];
  id: Scalars['ID']['input'];
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
  playwrightTraceUrl?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type IScreenshotBucket = INode & {
  __typename?: 'ScreenshotBucket';
  branch: Scalars['String']['output'];
  commit: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
};

export type IScreenshotDiff = INode & {
  __typename?: 'ScreenshotDiff';
  baseScreenshot?: Maybe<IScreenshot>;
  compareScreenshot?: Maybe<IScreenshot>;
  createdAt: Scalars['DateTime']['output'];
  flakyDetected: Scalars['Boolean']['output'];
  group?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  status: IScreenshotDiffStatus;
  test?: Maybe<ITest>;
  url?: Maybe<Scalars['String']['output']>;
  validationStatus?: Maybe<Scalars['String']['output']>;
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
  Removed = 'removed',
  Unchanged = 'unchanged'
}

export type IScreenshotMetadata = {
  __typename?: 'ScreenshotMetadata';
  automationLibrary: IScreenshotMetadataAutomationLibrary;
  browser?: Maybe<IScreenshotMetadataBrowser>;
  colorScheme?: Maybe<IScreenshotMetadataColorScheme>;
  mediaType?: Maybe<IScreenshotMetadataMediaType>;
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
  title: Scalars['String']['output'];
  titlePath: Array<Scalars['String']['output']>;
};

export type IScreenshotMetadataViewport = {
  __typename?: 'ScreenshotMetadataViewport';
  height: Scalars['Int']['output'];
  width: Scalars['Int']['output'];
};

export type ISetTeamMemberLevelInput = {
  level: ITeamUserLevel;
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type ISetupVercelIntegrationInput = {
  accountId: Scalars['ID']['input'];
  projects: Array<ISetupVercelIntegrationProjectInput>;
  vercelAccessToken: Scalars['String']['input'];
  vercelConfigurationId: Scalars['ID']['input'];
  vercelTeamId?: InputMaybe<Scalars['ID']['input']>;
};

export type ISetupVercelIntegrationProjectInput = {
  projectId: Scalars['ID']['input'];
  vercelProjectId: Scalars['ID']['input'];
};

export enum ISummaryCheck {
  Always = 'always',
  Auto = 'auto',
  Never = 'never'
}

export type ITeam = IAccount & INode & {
  __typename?: 'Team';
  avatar: IAccountAvatar;
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  ghAccount?: Maybe<IGithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<IGlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasPaidPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  inviteLink: Scalars['String']['output'];
  me?: Maybe<ITeamMember>;
  members: ITeamMemberConnection;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidSubscription?: Maybe<IAccountSubscription>;
  paymentProvider?: Maybe<IAccountSubscriptionProvider>;
  pendingCancelAt?: Maybe<Scalars['DateTime']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<IPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<IAccountSubscription>;
  subscriptionStatus?: Maybe<IAccountSubscriptionStatus>;
  trialStatus?: Maybe<ITrialStatus>;
  vercelConfiguration?: Maybe<IVercelConfiguration>;
};


export type ITeamMembersArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type ITeamProjectsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
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
  Member = 'member',
  Owner = 'owner'
}

export type ITest = INode & {
  __typename?: 'Test';
  buildName: Scalars['String']['output'];
  dailyChanges: Array<IDailyCount>;
  id: Scalars['ID']['output'];
  lastSeen?: Maybe<Scalars['DateTime']['output']>;
  mute: Scalars['Boolean']['output'];
  muteUntil?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  resolvedDate?: Maybe<Scalars['DateTime']['output']>;
  screenshot?: Maybe<IScreenshot>;
  stabilityScore?: Maybe<Scalars['Int']['output']>;
  status: ITestStatus;
  totalBuilds: Scalars['Int']['output'];
  unstable: Scalars['Boolean']['output'];
};

export type ITestConnection = IConnection & {
  __typename?: 'TestConnection';
  edges: Array<ITest>;
  pageInfo: IPageInfo;
};

export enum ITestStatus {
  Flaky = 'flaky',
  Pending = 'pending',
  Resolved = 'resolved'
}

export type ITransferProjectInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  targetAccountId: Scalars['ID']['input'];
};

export enum ITrialStatus {
  /** Trial is active */
  Active = 'active',
  /** Subscription ended when trial did */
  Expired = 'expired'
}

export type IUnlinkGithubRepositoryInput = {
  projectId: Scalars['ID']['input'];
};

export type IUnlinkGitlabProjectInput = {
  projectId: Scalars['ID']['input'];
};

export type IUnlinkVercelProjectInput = {
  projectId: Scalars['ID']['input'];
};

export type IUpdateAccountInput = {
  gitlabAccessToken?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type IUpdateProjectInput = {
  baselineBranch?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  summaryCheck?: InputMaybe<ISummaryCheck>;
};

export type IUpdateProjectPrCommentInput = {
  enable: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};

export type IUpdatedTestStatuses = {
  __typename?: 'UpdatedTestStatuses';
  ids: Array<Scalars['String']['output']>;
  status: ITestStatus;
};

export type IUser = IAccount & INode & {
  __typename?: 'User';
  avatar: IAccountAvatar;
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  ghAccount?: Maybe<IGithubAccount>;
  ghInstallations: IGhApiInstallationConnection;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<IGlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasPaidPlan: Scalars['Boolean']['output'];
  hasSubscribedToTrial: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  lastSubscription?: Maybe<IAccountSubscription>;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidSubscription?: Maybe<IAccountSubscription>;
  paymentProvider?: Maybe<IAccountSubscriptionProvider>;
  pendingCancelAt?: Maybe<Scalars['DateTime']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<IPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<IAccountSubscription>;
  subscriptionStatus?: Maybe<IAccountSubscriptionStatus>;
  teams: Array<ITeam>;
  trialStatus?: Maybe<ITrialStatus>;
  vercelConfiguration?: Maybe<IVercelConfiguration>;
};


export type IUserProjectsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
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

export type IVercelApiPagination = {
  __typename?: 'VercelApiPagination';
  count: Scalars['Int']['output'];
  next?: Maybe<Scalars['ID']['output']>;
  prev?: Maybe<Scalars['ID']['output']>;
};

export type IVercelApiProject = {
  __typename?: 'VercelApiProject';
  id: Scalars['ID']['output'];
  link?: Maybe<IVercelApiProjectLink>;
  linkedProject?: Maybe<IProject>;
  name: Scalars['String']['output'];
  project?: Maybe<IProject>;
  status: IVercelApiProjectStatus;
};


export type IVercelApiProjectStatusArgs = {
  accountId: Scalars['ID']['input'];
};

export type IVercelApiProjectConnection = {
  __typename?: 'VercelApiProjectConnection';
  pagination: IVercelApiPagination;
  projects: Array<IVercelApiProject>;
};

export type IVercelApiProjectLink = {
  type: Scalars['String']['output'];
};

export type IVercelApiProjectLinkGithub = IVercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkGithub';
  org: Scalars['String']['output'];
  repo: Scalars['String']['output'];
  repoId: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type IVercelApiProjectLinkOther = IVercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkOther';
  type: Scalars['String']['output'];
};

export enum IVercelApiProjectStatus {
  Linked = 'LINKED',
  LinkedToOtherTeam = 'LINKED_TO_OTHER_TEAM',
  NoProvider = 'NO_PROVIDER',
  ProviderNotSupported = 'PROVIDER_NOT_SUPPORTED',
  ReadyForLink = 'READY_FOR_LINK',
  RequireGithubAccess = 'REQUIRE_GITHUB_ACCESS',
  UnknownError = 'UNKNOWN_ERROR'
}

export type IVercelApiTeam = {
  __typename?: 'VercelApiTeam';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type IVercelApiToken = {
  __typename?: 'VercelApiToken';
  access_token: Scalars['String']['output'];
  installation_id: Scalars['String']['output'];
  team_id?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['String']['output'];
};

export type IVercelConfiguration = {
  __typename?: 'VercelConfiguration';
  apiProjects?: Maybe<IVercelApiProjectConnection>;
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
  vercelId: Scalars['ID']['output'];
};

export type IVercelProject = {
  __typename?: 'VercelProject';
  configuration: IVercelConfiguration;
  id: Scalars['ID']['output'];
};

export type IDailyCount = {
  __typename?: 'dailyCount';
  count: Scalars['Int']['output'];
  date: Scalars['Date']['output'];
};

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
export type IResolversInterfaceTypes<RefType extends Record<string, unknown>> = ResolversObject<{
  Account: ( Account ) | ( Account );
  Connection: ( Omit<IBuildConnection, 'edges'> & { edges: Array<RefType['Build']> } ) | ( Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<RefType['GhApiInstallation']> } ) | ( Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<RefType['GhApiRepository']> } ) | ( Omit<IGlApiNamespaceConnection, 'edges'> & { edges: Array<RefType['GlApiNamespace']> } ) | ( Omit<IGlApiProjectConnection, 'edges'> & { edges: Array<RefType['GlApiProject']> } ) | ( Omit<IProjectConnection, 'edges'> & { edges: Array<RefType['Project']> } ) | ( Omit<IScreenshotDiffConnection, 'edges'> & { edges: Array<RefType['ScreenshotDiff']> } ) | ( Omit<ITeamMemberConnection, 'edges'> & { edges: Array<RefType['TeamMember']> } ) | ( Omit<ITestConnection, 'edges'> & { edges: Array<RefType['Test']> } ) | ( Omit<IUserConnection, 'edges'> & { edges: Array<RefType['User']> } );
  Node: ( Subscription ) | ( Build ) | ( GhApiInstallation ) | ( IGhApiInstallationAccount ) | ( GhApiRepository ) | ( GithubAccount ) | ( GithubPullRequest ) | ( GithubRepository ) | ( GitlabProject ) | ( GlApiNamespace ) | ( GlApiProject ) | ( Plan ) | ( Project ) | ( Screenshot ) | ( ScreenshotBucket ) | ( ScreenshotDiff ) | ( Account ) | ( TeamUser ) | ( Test ) | ( Account );
  PullRequest: ( GithubPullRequest );
  Repository: ( GithubRepository ) | ( GitlabProject );
  VercelApiProjectLink: ( IVercelApiProjectLinkGithub ) | ( IVercelApiProjectLinkOther );
}>;

/** Mapping between all available schema types and the resolvers types */
export type IResolversTypes = ResolversObject<{
  Account: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['Account']>;
  AccountAvatar: ResolverTypeWrapper<AccountAvatar>;
  AccountSubscription: ResolverTypeWrapper<Subscription>;
  AccountSubscriptionProvider: IAccountSubscriptionProvider;
  AccountSubscriptionStatus: IAccountSubscriptionStatus;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Build: ResolverTypeWrapper<Build>;
  BuildConnection: ResolverTypeWrapper<Omit<IBuildConnection, 'edges'> & { edges: Array<IResolversTypes['Build']> }>;
  BuildStats: ResolverTypeWrapper<IBuildStats>;
  BuildStatus: IBuildStatus;
  BuildType: IBuildType;
  Connection: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['Connection']>;
  CreateTeamInput: ICreateTeamInput;
  CreateTeamResult: ResolverTypeWrapper<Omit<ICreateTeamResult, 'team'> & { team: IResolversTypes['Team'] }>;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteTeamInput: IDeleteTeamInput;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GhApiInstallation: ResolverTypeWrapper<GhApiInstallation>;
  GhApiInstallationAccount: ResolverTypeWrapper<IGhApiInstallationAccount>;
  GhApiInstallationConnection: ResolverTypeWrapper<Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<IResolversTypes['GhApiInstallation']> }>;
  GhApiRepository: ResolverTypeWrapper<GhApiRepository>;
  GhApiRepositoryConnection: ResolverTypeWrapper<Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<IResolversTypes['GhApiRepository']> }>;
  GithubAccount: ResolverTypeWrapper<GithubAccount>;
  GithubPullRequest: ResolverTypeWrapper<GithubPullRequest>;
  GithubRepository: ResolverTypeWrapper<GithubRepository>;
  GitlabProject: ResolverTypeWrapper<GitlabProject>;
  GlApiNamespace: ResolverTypeWrapper<GlApiNamespace>;
  GlApiNamespaceConnection: ResolverTypeWrapper<Omit<IGlApiNamespaceConnection, 'edges'> & { edges: Array<IResolversTypes['GlApiNamespace']> }>;
  GlApiProject: ResolverTypeWrapper<GlApiProject>;
  GlApiProjectConnection: ResolverTypeWrapper<Omit<IGlApiProjectConnection, 'edges'> & { edges: Array<IResolversTypes['GlApiProject']> }>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  ImportGithubProjectInput: IImportGithubProjectInput;
  ImportGitlabProjectInput: IImportGitlabProjectInput;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JobStatus: IJobStatus;
  LeaveTeamInput: ILeaveTeamInput;
  LinkGithubRepositoryInput: ILinkGithubRepositoryInput;
  LinkGitlabProjectInput: ILinkGitlabProjectInput;
  LinkVercelProjectInput: ILinkVercelProjectInput;
  Mutation: ResolverTypeWrapper<{}>;
  MuteUpdateTest: ResolverTypeWrapper<IMuteUpdateTest>;
  Node: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['Node']>;
  PageInfo: ResolverTypeWrapper<IPageInfo>;
  Permission: IPermission;
  Plan: ResolverTypeWrapper<Plan>;
  Project: ResolverTypeWrapper<Project>;
  ProjectConnection: ResolverTypeWrapper<Omit<IProjectConnection, 'edges'> & { edges: Array<IResolversTypes['Project']> }>;
  PullRequest: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['PullRequest']>;
  PullRequestState: IPullRequestState;
  Query: ResolverTypeWrapper<{}>;
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
  SetTeamMemberLevelInput: ISetTeamMemberLevelInput;
  SetupVercelIntegrationInput: ISetupVercelIntegrationInput;
  SetupVercelIntegrationProjectInput: ISetupVercelIntegrationProjectInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SummaryCheck: ISummaryCheck;
  Team: ResolverTypeWrapper<Account>;
  TeamMember: ResolverTypeWrapper<TeamUser>;
  TeamMemberConnection: ResolverTypeWrapper<Omit<ITeamMemberConnection, 'edges'> & { edges: Array<IResolversTypes['TeamMember']> }>;
  TeamUserLevel: ITeamUserLevel;
  Test: ResolverTypeWrapper<Test>;
  TestConnection: ResolverTypeWrapper<Omit<ITestConnection, 'edges'> & { edges: Array<IResolversTypes['Test']> }>;
  TestStatus: ITestStatus;
  Time: ResolverTypeWrapper<Scalars['Time']['output']>;
  TransferProjectInput: ITransferProjectInput;
  TrialStatus: ITrialStatus;
  UnlinkGithubRepositoryInput: IUnlinkGithubRepositoryInput;
  UnlinkGitlabProjectInput: IUnlinkGitlabProjectInput;
  UnlinkVercelProjectInput: IUnlinkVercelProjectInput;
  UpdateAccountInput: IUpdateAccountInput;
  UpdateProjectInput: IUpdateProjectInput;
  UpdateProjectPrCommentInput: IUpdateProjectPrCommentInput;
  UpdatedTestStatuses: ResolverTypeWrapper<IUpdatedTestStatuses>;
  User: ResolverTypeWrapper<Account>;
  UserConnection: ResolverTypeWrapper<Omit<IUserConnection, 'edges'> & { edges: Array<IResolversTypes['User']> }>;
  ValidationStatus: IValidationStatus;
  VercelApiPagination: ResolverTypeWrapper<IVercelApiPagination>;
  VercelApiProject: ResolverTypeWrapper<VercelApiProject>;
  VercelApiProjectConnection: ResolverTypeWrapper<Omit<IVercelApiProjectConnection, 'projects'> & { projects: Array<IResolversTypes['VercelApiProject']> }>;
  VercelApiProjectLink: ResolverTypeWrapper<IResolversInterfaceTypes<IResolversTypes>['VercelApiProjectLink']>;
  VercelApiProjectLinkGithub: ResolverTypeWrapper<IVercelApiProjectLinkGithub>;
  VercelApiProjectLinkOther: ResolverTypeWrapper<IVercelApiProjectLinkOther>;
  VercelApiProjectStatus: IVercelApiProjectStatus;
  VercelApiTeam: ResolverTypeWrapper<VercelApiTeam>;
  VercelApiToken: ResolverTypeWrapper<IVercelApiToken>;
  VercelConfiguration: ResolverTypeWrapper<VercelConfiguration>;
  VercelProject: ResolverTypeWrapper<VercelProject>;
  dailyCount: ResolverTypeWrapper<IDailyCount>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type IResolversParentTypes = ResolversObject<{
  Account: IResolversInterfaceTypes<IResolversParentTypes>['Account'];
  AccountAvatar: AccountAvatar;
  AccountSubscription: Subscription;
  Boolean: Scalars['Boolean']['output'];
  Build: Build;
  BuildConnection: Omit<IBuildConnection, 'edges'> & { edges: Array<IResolversParentTypes['Build']> };
  BuildStats: IBuildStats;
  Connection: IResolversInterfaceTypes<IResolversParentTypes>['Connection'];
  CreateTeamInput: ICreateTeamInput;
  CreateTeamResult: Omit<ICreateTeamResult, 'team'> & { team: IResolversParentTypes['Team'] };
  Date: Scalars['Date']['output'];
  DateTime: Scalars['DateTime']['output'];
  DeleteTeamInput: IDeleteTeamInput;
  Float: Scalars['Float']['output'];
  GhApiInstallation: GhApiInstallation;
  GhApiInstallationAccount: IGhApiInstallationAccount;
  GhApiInstallationConnection: Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<IResolversParentTypes['GhApiInstallation']> };
  GhApiRepository: GhApiRepository;
  GhApiRepositoryConnection: Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<IResolversParentTypes['GhApiRepository']> };
  GithubAccount: GithubAccount;
  GithubPullRequest: GithubPullRequest;
  GithubRepository: GithubRepository;
  GitlabProject: GitlabProject;
  GlApiNamespace: GlApiNamespace;
  GlApiNamespaceConnection: Omit<IGlApiNamespaceConnection, 'edges'> & { edges: Array<IResolversParentTypes['GlApiNamespace']> };
  GlApiProject: GlApiProject;
  GlApiProjectConnection: Omit<IGlApiProjectConnection, 'edges'> & { edges: Array<IResolversParentTypes['GlApiProject']> };
  ID: Scalars['ID']['output'];
  ImportGithubProjectInput: IImportGithubProjectInput;
  ImportGitlabProjectInput: IImportGitlabProjectInput;
  Int: Scalars['Int']['output'];
  LeaveTeamInput: ILeaveTeamInput;
  LinkGithubRepositoryInput: ILinkGithubRepositoryInput;
  LinkGitlabProjectInput: ILinkGitlabProjectInput;
  LinkVercelProjectInput: ILinkVercelProjectInput;
  Mutation: {};
  MuteUpdateTest: IMuteUpdateTest;
  Node: IResolversInterfaceTypes<IResolversParentTypes>['Node'];
  PageInfo: IPageInfo;
  Plan: Plan;
  Project: Project;
  ProjectConnection: Omit<IProjectConnection, 'edges'> & { edges: Array<IResolversParentTypes['Project']> };
  PullRequest: IResolversInterfaceTypes<IResolversParentTypes>['PullRequest'];
  Query: {};
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
  SetTeamMemberLevelInput: ISetTeamMemberLevelInput;
  SetupVercelIntegrationInput: ISetupVercelIntegrationInput;
  SetupVercelIntegrationProjectInput: ISetupVercelIntegrationProjectInput;
  String: Scalars['String']['output'];
  Team: Account;
  TeamMember: TeamUser;
  TeamMemberConnection: Omit<ITeamMemberConnection, 'edges'> & { edges: Array<IResolversParentTypes['TeamMember']> };
  Test: Test;
  TestConnection: Omit<ITestConnection, 'edges'> & { edges: Array<IResolversParentTypes['Test']> };
  Time: Scalars['Time']['output'];
  TransferProjectInput: ITransferProjectInput;
  UnlinkGithubRepositoryInput: IUnlinkGithubRepositoryInput;
  UnlinkGitlabProjectInput: IUnlinkGitlabProjectInput;
  UnlinkVercelProjectInput: IUnlinkVercelProjectInput;
  UpdateAccountInput: IUpdateAccountInput;
  UpdateProjectInput: IUpdateProjectInput;
  UpdateProjectPrCommentInput: IUpdateProjectPrCommentInput;
  UpdatedTestStatuses: IUpdatedTestStatuses;
  User: Account;
  UserConnection: Omit<IUserConnection, 'edges'> & { edges: Array<IResolversParentTypes['User']> };
  VercelApiPagination: IVercelApiPagination;
  VercelApiProject: VercelApiProject;
  VercelApiProjectConnection: Omit<IVercelApiProjectConnection, 'projects'> & { projects: Array<IResolversParentTypes['VercelApiProject']> };
  VercelApiProjectLink: IResolversInterfaceTypes<IResolversParentTypes>['VercelApiProjectLink'];
  VercelApiProjectLinkGithub: IVercelApiProjectLinkGithub;
  VercelApiProjectLinkOther: IVercelApiProjectLinkOther;
  VercelApiTeam: VercelApiTeam;
  VercelApiToken: IVercelApiToken;
  VercelConfiguration: VercelConfiguration;
  VercelProject: VercelProject;
  dailyCount: IDailyCount;
}>;

export type IAccountResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Account'] = IResolversParentTypes['Account']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Team' | 'User', ParentType, ContextType>;
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  consumptionRatio?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ghAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  gitlabAccessToken?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  glNamespaces?: Resolver<Maybe<IResolversTypes['GlApiNamespaceConnection']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasPaidPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  includedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  paymentProvider?: Resolver<Maybe<IResolversTypes['AccountSubscriptionProvider']>, ParentType, ContextType>;
  pendingCancelAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<IAccountProjectsArgs, 'after' | 'first'>>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  subscriptionStatus?: Resolver<Maybe<IResolversTypes['AccountSubscriptionStatus']>, ParentType, ContextType>;
  trialStatus?: Resolver<Maybe<IResolversTypes['TrialStatus']>, ParentType, ContextType>;
  vercelConfiguration?: Resolver<Maybe<IResolversTypes['VercelConfiguration']>, ParentType, ContextType>;
}>;

export type IAccountAvatarResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountAvatar'] = IResolversParentTypes['AccountAvatar']> = ResolversObject<{
  color?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  initial?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType, RequireFields<IAccountAvatarUrlArgs, 'size'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IAccountSubscriptionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountSubscription'] = IResolversParentTypes['AccountSubscription']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  paymentMethodFilled?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  provider?: Resolver<IResolversTypes['AccountSubscriptionProvider'], ParentType, ContextType>;
  trialDaysRemaining?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Build'] = IResolversParentTypes['Build']> = ResolversObject<{
  baseScreenshotBucket?: Resolver<Maybe<IResolversTypes['ScreenshotBucket']>, ParentType, ContextType>;
  batchCount?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  branch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  commit?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  number?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  prHeadCommit?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  prNumber?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  pullRequest?: Resolver<Maybe<IResolversTypes['PullRequest']>, ParentType, ContextType>;
  screenshotDiffs?: Resolver<IResolversTypes['ScreenshotDiffConnection'], ParentType, ContextType, RequireFields<IBuildScreenshotDiffsArgs, 'after' | 'first'>>;
  stats?: Resolver<IResolversTypes['BuildStats'], ParentType, ContextType>;
  status?: Resolver<IResolversTypes['BuildStatus'], ParentType, ContextType>;
  totalBatch?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<Maybe<IResolversTypes['BuildType']>, ParentType, ContextType>;
  updatedAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['BuildConnection'] = IResolversParentTypes['BuildConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['Build']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildStatsResolvers<ContextType = Context, ParentType extends IResolversParentTypes['BuildStats'] = IResolversParentTypes['BuildStats']> = ResolversObject<{
  added?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  changed?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  failure?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  removed?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  unchanged?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Connection'] = IResolversParentTypes['Connection']> = ResolversObject<{
  __resolveType: TypeResolveFn<'BuildConnection' | 'GhApiInstallationConnection' | 'GhApiRepositoryConnection' | 'GlApiNamespaceConnection' | 'GlApiProjectConnection' | 'ProjectConnection' | 'ScreenshotDiffConnection' | 'TeamMemberConnection' | 'TestConnection' | 'UserConnection', ParentType, ContextType>;
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
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  login?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
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

export type IGlApiNamespaceResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GlApiNamespace'] = IResolversParentTypes['GlApiNamespace']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
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

export type IMutationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Mutation'] = IResolversParentTypes['Mutation']> = ResolversObject<{
  acceptInvitation?: Resolver<IResolversTypes['Team'], ParentType, ContextType, RequireFields<IMutationAcceptInvitationArgs, 'token'>>;
  createTeam?: Resolver<IResolversTypes['CreateTeamResult'], ParentType, ContextType, RequireFields<IMutationCreateTeamArgs, 'input'>>;
  deleteProject?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationDeleteProjectArgs, 'id'>>;
  deleteTeam?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationDeleteTeamArgs, 'input'>>;
  importGithubProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationImportGithubProjectArgs, 'input'>>;
  importGitlabProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationImportGitlabProjectArgs, 'input'>>;
  leaveTeam?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationLeaveTeamArgs, 'input'>>;
  linkGithubRepository?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationLinkGithubRepositoryArgs, 'input'>>;
  linkGitlabProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationLinkGitlabProjectArgs, 'input'>>;
  linkVercelProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationLinkVercelProjectArgs, 'input'>>;
  muteTests?: Resolver<IResolversTypes['MuteUpdateTest'], ParentType, ContextType, RequireFields<IMutationMuteTestsArgs, 'ids' | 'muted'>>;
  ping?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  removeUserFromTeam?: Resolver<IResolversTypes['RemoveUserFromTeamPayload'], ParentType, ContextType, RequireFields<IMutationRemoveUserFromTeamArgs, 'input'>>;
  retrieveVercelToken?: Resolver<IResolversTypes['VercelApiToken'], ParentType, ContextType, RequireFields<IMutationRetrieveVercelTokenArgs, 'code'>>;
  setTeamMemberLevel?: Resolver<IResolversTypes['TeamMember'], ParentType, ContextType, RequireFields<IMutationSetTeamMemberLevelArgs, 'input'>>;
  setValidationStatus?: Resolver<IResolversTypes['Build'], ParentType, ContextType, RequireFields<IMutationSetValidationStatusArgs, 'buildId' | 'validationStatus'>>;
  setupVercelIntegration?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<IMutationSetupVercelIntegrationArgs, 'input'>>;
  terminateTrial?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationTerminateTrialArgs, 'accountId'>>;
  transferProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationTransferProjectArgs, 'input'>>;
  unlinkGithubRepository?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUnlinkGithubRepositoryArgs, 'input'>>;
  unlinkGitlabProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUnlinkGitlabProjectArgs, 'input'>>;
  unlinkVercelProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUnlinkVercelProjectArgs, 'input'>>;
  updateAccount?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationUpdateAccountArgs, 'input'>>;
  updateProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUpdateProjectArgs, 'input'>>;
  updateProjectPrComment?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUpdateProjectPrCommentArgs, 'input'>>;
  updateTestStatuses?: Resolver<IResolversTypes['UpdatedTestStatuses'], ParentType, ContextType, RequireFields<IMutationUpdateTestStatusesArgs, 'ids' | 'status'>>;
}>;

export type IMuteUpdateTestResolvers<ContextType = Context, ParentType extends IResolversParentTypes['MuteUpdateTest'] = IResolversParentTypes['MuteUpdateTest']> = ResolversObject<{
  ids?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  mute?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  muteUntil?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type INodeResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Node'] = IResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'AccountSubscription' | 'Build' | 'GhApiInstallation' | 'GhApiInstallationAccount' | 'GhApiRepository' | 'GithubAccount' | 'GithubPullRequest' | 'GithubRepository' | 'GitlabProject' | 'GlApiNamespace' | 'GlApiProject' | 'Plan' | 'Project' | 'Screenshot' | 'ScreenshotBucket' | 'ScreenshotDiff' | 'Team' | 'TeamMember' | 'Test' | 'User', ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
}>;

export type IPageInfoResolvers<ContextType = Context, ParentType extends IResolversParentTypes['PageInfo'] = IResolversParentTypes['PageInfo']> = ResolversObject<{
  hasNextPage?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IPlanResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Plan'] = IResolversParentTypes['Plan']> = ResolversObject<{
  displayName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  usageBased?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Project'] = IResolversParentTypes['Project']> = ResolversObject<{
  account?: Resolver<IResolversTypes['Account'], ParentType, ContextType>;
  baselineBranch?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  build?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType, RequireFields<IProjectBuildArgs, 'number'>>;
  buildNames?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  builds?: Resolver<IResolversTypes['BuildConnection'], ParentType, ContextType, RequireFields<IProjectBuildsArgs, 'after' | 'first'>>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  latestBuild?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType>;
  latestReferenceBuild?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  prCommentEnabled?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  private?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType>;
  public?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  referenceBranch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  repository?: Resolver<Maybe<IResolversTypes['Repository']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  summaryCheck?: Resolver<IResolversTypes['SummaryCheck'], ParentType, ContextType>;
  tests?: Resolver<IResolversTypes['TestConnection'], ParentType, ContextType, RequireFields<IProjectTestsArgs, 'after' | 'first'>>;
  token?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  totalScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  vercelProject?: Resolver<Maybe<IResolversTypes['VercelProject']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ProjectConnection'] = IResolversParentTypes['ProjectConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['Project']>, ParentType, ContextType>;
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
  ghApiInstallationRepositories?: Resolver<IResolversTypes['GhApiRepositoryConnection'], ParentType, ContextType, RequireFields<IQueryGhApiInstallationRepositoriesArgs, 'installationId' | 'page'>>;
  glApiProjects?: Resolver<IResolversTypes['GlApiProjectConnection'], ParentType, ContextType, RequireFields<IQueryGlApiProjectsArgs, 'accessToken' | 'allProjects' | 'page'>>;
  invitation?: Resolver<Maybe<IResolversTypes['Team']>, ParentType, ContextType, RequireFields<IQueryInvitationArgs, 'token'>>;
  me?: Resolver<Maybe<IResolversTypes['User']>, ParentType, ContextType>;
  ping?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  project?: Resolver<Maybe<IResolversTypes['Project']>, ParentType, ContextType, RequireFields<IQueryProjectArgs, 'accountSlug' | 'projectName'>>;
  projectById?: Resolver<Maybe<IResolversTypes['Project']>, ParentType, ContextType, RequireFields<IQueryProjectByIdArgs, 'id'>>;
  teamById?: Resolver<Maybe<IResolversTypes['Team']>, ParentType, ContextType, RequireFields<IQueryTeamByIdArgs, 'id'>>;
  vercelApiProjects?: Resolver<IResolversTypes['VercelApiProjectConnection'], ParentType, ContextType, RequireFields<IQueryVercelApiProjectsArgs, 'accessToken'>>;
  vercelApiTeam?: Resolver<Maybe<IResolversTypes['VercelApiTeam']>, ParentType, ContextType, RequireFields<IQueryVercelApiTeamArgs, 'accessToken' | 'id'>>;
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
  playwrightTraceUrl?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  width?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotBucketResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotBucket'] = IResolversParentTypes['ScreenshotBucket']> = ResolversObject<{
  branch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  commit?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotDiffResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotDiff'] = IResolversParentTypes['ScreenshotDiff']> = ResolversObject<{
  baseScreenshot?: Resolver<Maybe<IResolversTypes['Screenshot']>, ParentType, ContextType>;
  compareScreenshot?: Resolver<Maybe<IResolversTypes['Screenshot']>, ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  flakyDetected?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  group?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  height?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<IResolversTypes['ScreenshotDiffStatus'], ParentType, ContextType>;
  test?: Resolver<Maybe<IResolversTypes['Test']>, ParentType, ContextType>;
  url?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  validationStatus?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
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
  title?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  titlePath?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IScreenshotMetadataViewportResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ScreenshotMetadataViewport'] = IResolversParentTypes['ScreenshotMetadataViewport']> = ResolversObject<{
  height?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  width?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITeamResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Team'] = IResolversParentTypes['Team']> = ResolversObject<{
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  consumptionRatio?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ghAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  gitlabAccessToken?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  glNamespaces?: Resolver<Maybe<IResolversTypes['GlApiNamespaceConnection']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasPaidPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  includedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  inviteLink?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  me?: Resolver<Maybe<IResolversTypes['TeamMember']>, ParentType, ContextType>;
  members?: Resolver<IResolversTypes['TeamMemberConnection'], ParentType, ContextType, RequireFields<ITeamMembersArgs, 'after' | 'first'>>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  oldPaidSubscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  paymentProvider?: Resolver<Maybe<IResolversTypes['AccountSubscriptionProvider']>, ParentType, ContextType>;
  pendingCancelAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<ITeamProjectsArgs, 'after' | 'first'>>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  subscriptionStatus?: Resolver<Maybe<IResolversTypes['AccountSubscriptionStatus']>, ParentType, ContextType>;
  trialStatus?: Resolver<Maybe<IResolversTypes['TrialStatus']>, ParentType, ContextType>;
  vercelConfiguration?: Resolver<Maybe<IResolversTypes['VercelConfiguration']>, ParentType, ContextType>;
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
  buildName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  dailyChanges?: Resolver<Array<IResolversTypes['dailyCount']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  lastSeen?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  mute?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  muteUntil?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  resolvedDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  screenshot?: Resolver<Maybe<IResolversTypes['Screenshot']>, ParentType, ContextType>;
  stabilityScore?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  status?: Resolver<IResolversTypes['TestStatus'], ParentType, ContextType>;
  totalBuilds?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  unstable?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ITestConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['TestConnection'] = IResolversParentTypes['TestConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['Test']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface ITimeScalarConfig extends GraphQLScalarTypeConfig<IResolversTypes['Time'], any> {
  name: 'Time';
}

export type IUpdatedTestStatusesResolvers<ContextType = Context, ParentType extends IResolversParentTypes['UpdatedTestStatuses'] = IResolversParentTypes['UpdatedTestStatuses']> = ResolversObject<{
  ids?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<IResolversTypes['TestStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IUserResolvers<ContextType = Context, ParentType extends IResolversParentTypes['User'] = IResolversParentTypes['User']> = ResolversObject<{
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  consumptionRatio?: Resolver<IResolversTypes['Float'], ParentType, ContextType>;
  currentPeriodScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ghAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  ghInstallations?: Resolver<IResolversTypes['GhApiInstallationConnection'], ParentType, ContextType>;
  gitlabAccessToken?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  glNamespaces?: Resolver<Maybe<IResolversTypes['GlApiNamespaceConnection']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasPaidPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasSubscribedToTrial?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  includedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  lastSubscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  oldPaidSubscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  paymentProvider?: Resolver<Maybe<IResolversTypes['AccountSubscriptionProvider']>, ParentType, ContextType>;
  pendingCancelAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<IUserProjectsArgs, 'after' | 'first'>>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  subscription?: Resolver<Maybe<IResolversTypes['AccountSubscription']>, ParentType, ContextType>;
  subscriptionStatus?: Resolver<Maybe<IResolversTypes['AccountSubscriptionStatus']>, ParentType, ContextType>;
  teams?: Resolver<Array<IResolversTypes['Team']>, ParentType, ContextType>;
  trialStatus?: Resolver<Maybe<IResolversTypes['TrialStatus']>, ParentType, ContextType>;
  vercelConfiguration?: Resolver<Maybe<IResolversTypes['VercelConfiguration']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IUserConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['UserConnection'] = IResolversParentTypes['UserConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['User']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelApiPaginationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiPagination'] = IResolversParentTypes['VercelApiPagination']> = ResolversObject<{
  count?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  next?: Resolver<Maybe<IResolversTypes['ID']>, ParentType, ContextType>;
  prev?: Resolver<Maybe<IResolversTypes['ID']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelApiProjectResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiProject'] = IResolversParentTypes['VercelApiProject']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  link?: Resolver<Maybe<IResolversTypes['VercelApiProjectLink']>, ParentType, ContextType>;
  linkedProject?: Resolver<Maybe<IResolversTypes['Project']>, ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  project?: Resolver<Maybe<IResolversTypes['Project']>, ParentType, ContextType>;
  status?: Resolver<IResolversTypes['VercelApiProjectStatus'], ParentType, ContextType, RequireFields<IVercelApiProjectStatusArgs, 'accountId'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelApiProjectConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiProjectConnection'] = IResolversParentTypes['VercelApiProjectConnection']> = ResolversObject<{
  pagination?: Resolver<IResolversTypes['VercelApiPagination'], ParentType, ContextType>;
  projects?: Resolver<Array<IResolversTypes['VercelApiProject']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelApiProjectLinkResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiProjectLink'] = IResolversParentTypes['VercelApiProjectLink']> = ResolversObject<{
  __resolveType: TypeResolveFn<'VercelApiProjectLinkGithub' | 'VercelApiProjectLinkOther', ParentType, ContextType>;
  type?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
}>;

export type IVercelApiProjectLinkGithubResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiProjectLinkGithub'] = IResolversParentTypes['VercelApiProjectLinkGithub']> = ResolversObject<{
  org?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  repo?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  repoId?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  type?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelApiProjectLinkOtherResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiProjectLinkOther'] = IResolversParentTypes['VercelApiProjectLinkOther']> = ResolversObject<{
  type?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelApiTeamResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiTeam'] = IResolversParentTypes['VercelApiTeam']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelApiTokenResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelApiToken'] = IResolversParentTypes['VercelApiToken']> = ResolversObject<{
  access_token?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  installation_id?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  team_id?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  user_id?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelConfigurationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelConfiguration'] = IResolversParentTypes['VercelConfiguration']> = ResolversObject<{
  apiProjects?: Resolver<Maybe<IResolversTypes['VercelApiProjectConnection']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  url?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  vercelId?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IVercelProjectResolvers<ContextType = Context, ParentType extends IResolversParentTypes['VercelProject'] = IResolversParentTypes['VercelProject']> = ResolversObject<{
  configuration?: Resolver<IResolversTypes['VercelConfiguration'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IDailyCountResolvers<ContextType = Context, ParentType extends IResolversParentTypes['dailyCount'] = IResolversParentTypes['dailyCount']> = ResolversObject<{
  count?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  date?: Resolver<IResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IResolvers<ContextType = Context> = ResolversObject<{
  Account?: IAccountResolvers<ContextType>;
  AccountAvatar?: IAccountAvatarResolvers<ContextType>;
  AccountSubscription?: IAccountSubscriptionResolvers<ContextType>;
  Build?: IBuildResolvers<ContextType>;
  BuildConnection?: IBuildConnectionResolvers<ContextType>;
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
  GithubPullRequest?: IGithubPullRequestResolvers<ContextType>;
  GithubRepository?: IGithubRepositoryResolvers<ContextType>;
  GitlabProject?: IGitlabProjectResolvers<ContextType>;
  GlApiNamespace?: IGlApiNamespaceResolvers<ContextType>;
  GlApiNamespaceConnection?: IGlApiNamespaceConnectionResolvers<ContextType>;
  GlApiProject?: IGlApiProjectResolvers<ContextType>;
  GlApiProjectConnection?: IGlApiProjectConnectionResolvers<ContextType>;
  Mutation?: IMutationResolvers<ContextType>;
  MuteUpdateTest?: IMuteUpdateTestResolvers<ContextType>;
  Node?: INodeResolvers<ContextType>;
  PageInfo?: IPageInfoResolvers<ContextType>;
  Plan?: IPlanResolvers<ContextType>;
  Project?: IProjectResolvers<ContextType>;
  ProjectConnection?: IProjectConnectionResolvers<ContextType>;
  PullRequest?: IPullRequestResolvers<ContextType>;
  Query?: IQueryResolvers<ContextType>;
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
  Team?: ITeamResolvers<ContextType>;
  TeamMember?: ITeamMemberResolvers<ContextType>;
  TeamMemberConnection?: ITeamMemberConnectionResolvers<ContextType>;
  Test?: ITestResolvers<ContextType>;
  TestConnection?: ITestConnectionResolvers<ContextType>;
  Time?: GraphQLScalarType;
  UpdatedTestStatuses?: IUpdatedTestStatusesResolvers<ContextType>;
  User?: IUserResolvers<ContextType>;
  UserConnection?: IUserConnectionResolvers<ContextType>;
  VercelApiPagination?: IVercelApiPaginationResolvers<ContextType>;
  VercelApiProject?: IVercelApiProjectResolvers<ContextType>;
  VercelApiProjectConnection?: IVercelApiProjectConnectionResolvers<ContextType>;
  VercelApiProjectLink?: IVercelApiProjectLinkResolvers<ContextType>;
  VercelApiProjectLinkGithub?: IVercelApiProjectLinkGithubResolvers<ContextType>;
  VercelApiProjectLinkOther?: IVercelApiProjectLinkOtherResolvers<ContextType>;
  VercelApiTeam?: IVercelApiTeamResolvers<ContextType>;
  VercelApiToken?: IVercelApiTokenResolvers<ContextType>;
  VercelConfiguration?: IVercelConfigurationResolvers<ContextType>;
  VercelProject?: IVercelProjectResolvers<ContextType>;
  dailyCount?: IDailyCountResolvers<ContextType>;
}>;

