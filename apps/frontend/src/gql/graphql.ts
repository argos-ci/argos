/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: any; output: any; }
  DateTime: { input: any; output: any; }
  JSONObject: { input: any; output: any; }
  Time: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
};

export type Account = {
  avatar: AccountAvatar;
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  githubAccount?: Maybe<GithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  gitlabBaseUrl?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<GlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  metrics: AccountMetrics;
  name?: Maybe<Scalars['String']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<AccountPermission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  slackInstallation?: Maybe<SlackInstallation>;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<AccountSubscription>;
  subscriptionStatus?: Maybe<AccountSubscriptionStatus>;
};


export type AccountMetricsArgs = {
  input: AccountMetricsInput;
};


export type AccountProjectsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type AccountAvatar = {
  __typename?: 'AccountAvatar';
  color: Scalars['String']['output'];
  initial: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};


export type AccountAvatarUrlArgs = {
  size: Scalars['Int']['input'];
};

export type AccountBuildsMetrics = {
  __typename?: 'AccountBuildsMetrics';
  all: AccountMetricData;
  projects: Array<Project>;
  series: Array<AccountMetricDataPoint>;
};

export type AccountMetricData = {
  __typename?: 'AccountMetricData';
  projects: Scalars['JSONObject']['output'];
  total: Scalars['Int']['output'];
};

export type AccountMetricDataPoint = {
  __typename?: 'AccountMetricDataPoint';
  projects: Scalars['JSONObject']['output'];
  total: Scalars['Int']['output'];
  ts: Scalars['Timestamp']['output'];
};

export type AccountMetrics = {
  __typename?: 'AccountMetrics';
  builds: AccountBuildsMetrics;
  screenshots: AccountScreenshotMetrics;
};

export type AccountMetricsInput = {
  from: Scalars['DateTime']['input'];
  groupBy: TimeSeriesGroupBy;
  projectIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export enum AccountPermission {
  Admin = 'admin',
  View = 'view'
}

export type AccountScreenshotMetrics = {
  __typename?: 'AccountScreenshotMetrics';
  all: AccountMetricData;
  projects: Array<Project>;
  series: Array<AccountMetricDataPoint>;
};

export type AccountSubscription = Node & {
  __typename?: 'AccountSubscription';
  endDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  paymentMethodFilled: Scalars['Boolean']['output'];
  provider: AccountSubscriptionProvider;
  status: AccountSubscriptionStatus;
  trialDaysRemaining?: Maybe<Scalars['Int']['output']>;
};

export enum AccountSubscriptionProvider {
  Github = 'github',
  Stripe = 'stripe'
}

export enum AccountSubscriptionStatus {
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

export type AddContributorToProjectInput = {
  level: ProjectUserLevel;
  projectId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export enum BaseBranchResolution {
  /** Base branch is resolved from the project settings */
  Project = 'project',
  /** Base branch is resolved from the pull request */
  PullRequest = 'pullRequest',
  /** Base branch specified by the user through the API / SDK */
  User = 'user'
}

export type Build = Node & {
  __typename?: 'Build';
  /** Base branch used to resolve the base build */
  baseBranch?: Maybe<Scalars['String']['output']>;
  /** Base branch resolved from */
  baseBranchResolvedFrom?: Maybe<BaseBranchResolution>;
  /** The base build that contains the base screeenshot bucket */
  baseBuild?: Maybe<Build>;
  /** The screenshot bucket that serves as base for comparison */
  baseScreenshotBucket?: Maybe<ScreenshotBucket>;
  /** Branch */
  branch?: Maybe<Scalars['String']['output']>;
  /** Commit */
  commit: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Aggregated metadata */
  metadata?: Maybe<BuildMetadata>;
  /** Mode */
  mode: BuildMode;
  /** Build name */
  name: Scalars['String']['output'];
  /** Continuous number. It is incremented after each build */
  number: Scalars['Int']['output'];
  /** Parallel infos */
  parallel?: Maybe<BuildParallel>;
  /** Pull request head commit */
  prHeadCommit?: Maybe<Scalars['String']['output']>;
  /** Pull request number */
  prNumber?: Maybe<Scalars['Int']['output']>;
  /** Pull request */
  pullRequest?: Maybe<PullRequest>;
  /** The screenshot diffs between the base screenshot bucket of the compare screenshot bucket */
  screenshotDiffs: ScreenshotDiffConnection;
  /** Build stats */
  stats?: Maybe<BuildStats>;
  /** Review status, conclusion or job status */
  status: BuildStatus;
  /** Build type */
  type?: Maybe<BuildType>;
  updatedAt: Scalars['DateTime']['output'];
};


export type BuildScreenshotDiffsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
};

export type BuildConnection = Connection & {
  __typename?: 'BuildConnection';
  edges: Array<Build>;
  pageInfo: PageInfo;
};

export type BuildMetadata = {
  __typename?: 'BuildMetadata';
  testReport?: Maybe<TestReport>;
};

export enum BuildMode {
  /** Build is compared with a baseline found by analyzing Git history */
  Ci = 'ci',
  /** Build is compared with the latest approved build */
  Monitoring = 'monitoring'
}

export type BuildParallel = {
  __typename?: 'BuildParallel';
  nonce: Scalars['String']['output'];
  received: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type BuildStats = {
  __typename?: 'BuildStats';
  added: Scalars['Int']['output'];
  changed: Scalars['Int']['output'];
  failure: Scalars['Int']['output'];
  removed: Scalars['Int']['output'];
  retryFailure: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  unchanged: Scalars['Int']['output'];
};

export enum BuildStatus {
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

export enum BuildType {
  /** Comparison build */
  Check = 'check',
  /** No baseline build found */
  Orphan = 'orphan',
  /** Build auto-approved */
  Reference = 'reference'
}

export type Connection = {
  edges: Array<Node>;
  pageInfo: PageInfo;
};

export type CreateTeamInput = {
  name: Scalars['String']['input'];
};

export type CreateTeamResult = {
  __typename?: 'CreateTeamResult';
  redirectUrl: Scalars['String']['output'];
  team: Team;
};

export type DeleteTeamInput = {
  accountId: Scalars['ID']['input'];
};

export type DisableGitHubSsoOnTeamInput = {
  teamAccountId: Scalars['ID']['input'];
};

export type DisconnectGitHubAuthInput = {
  accountId: Scalars['ID']['input'];
};

export type DisconnectGitLabAuthInput = {
  accountId: Scalars['ID']['input'];
};

export type DisconnectGoogleAuthInput = {
  accountId: Scalars['ID']['input'];
};

export type EnableGitHubSsoOnTeamInput = {
  ghInstallationId: Scalars['Int']['input'];
  teamAccountId: Scalars['ID']['input'];
};

export type GhApiInstallation = Node & {
  __typename?: 'GhApiInstallation';
  account: GhApiInstallationAccount;
  id: Scalars['ID']['output'];
};

export type GhApiInstallationAccount = Node & {
  __typename?: 'GhApiInstallationAccount';
  id: Scalars['ID']['output'];
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type GhApiInstallationConnection = Connection & {
  __typename?: 'GhApiInstallationConnection';
  edges: Array<GhApiInstallation>;
  pageInfo: PageInfo;
};

export type GhApiRepository = Node & {
  __typename?: 'GhApiRepository';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  owner_login: Scalars['String']['output'];
  updated_at: Scalars['String']['output'];
};

export type GhApiRepositoryConnection = Connection & {
  __typename?: 'GhApiRepositoryConnection';
  edges: Array<GhApiRepository>;
  pageInfo: PageInfo;
};

export enum GitHubAppType {
  Light = 'light',
  Main = 'main'
}

export type GithubAccount = Node & {
  __typename?: 'GithubAccount';
  avatar: AccountAvatar;
  id: Scalars['ID']['output'];
  lastLoggedAt?: Maybe<Scalars['DateTime']['output']>;
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type GithubInstallation = Node & {
  __typename?: 'GithubInstallation';
  ghAccount?: Maybe<GhApiInstallationAccount>;
  ghInstallation?: Maybe<GhApiInstallation>;
  id: Scalars['ID']['output'];
};

export type GithubPullRequest = Node & PullRequest & {
  __typename?: 'GithubPullRequest';
  closedAt?: Maybe<Scalars['DateTime']['output']>;
  creator?: Maybe<GithubAccount>;
  date?: Maybe<Scalars['DateTime']['output']>;
  draft?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  merged?: Maybe<Scalars['Boolean']['output']>;
  mergedAt?: Maybe<Scalars['DateTime']['output']>;
  number: Scalars['Int']['output'];
  state?: Maybe<PullRequestState>;
  title?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type GithubRepository = Node & Repository & {
  __typename?: 'GithubRepository';
  defaultBranch: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  private: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
};

export type GitlabProject = Node & Repository & {
  __typename?: 'GitlabProject';
  defaultBranch: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  private: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
};

export type GitlabUser = Node & {
  __typename?: 'GitlabUser';
  id: Scalars['ID']['output'];
  lastLoggedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  url: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type GlApiNamespace = Node & {
  __typename?: 'GlApiNamespace';
  id: Scalars['ID']['output'];
  isProjectToken: Scalars['Boolean']['output'];
  kind: Scalars['String']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export type GlApiNamespaceConnection = Connection & {
  __typename?: 'GlApiNamespaceConnection';
  edges: Array<GlApiNamespace>;
  pageInfo: PageInfo;
};

export type GlApiProject = Node & {
  __typename?: 'GlApiProject';
  id: Scalars['ID']['output'];
  last_activity_at: Scalars['String']['output'];
  name: Scalars['String']['output'];
  namespace: GlApiNamespace;
};

export type GlApiProjectConnection = Connection & {
  __typename?: 'GlApiProjectConnection';
  edges: Array<GlApiProject>;
  pageInfo: PageInfo;
};

export type GoogleUser = Node & {
  __typename?: 'GoogleUser';
  id: Scalars['ID']['output'];
  lastLoggedAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  primaryEmail?: Maybe<Scalars['String']['output']>;
};

export type ImportGithubProjectInput = {
  accountSlug: Scalars['String']['input'];
  app: GitHubAppType;
  owner: Scalars['String']['input'];
  repo: Scalars['String']['input'];
};

export type ImportGitlabProjectInput = {
  accountSlug: Scalars['String']['input'];
  gitlabProjectId: Scalars['ID']['input'];
};

export enum JobStatus {
  Aborted = 'aborted',
  Complete = 'complete',
  Error = 'error',
  Pending = 'pending',
  Progress = 'progress'
}

export type LeaveTeamInput = {
  teamAccountId: Scalars['ID']['input'];
};

export type LinkGithubRepositoryInput = {
  app: GitHubAppType;
  owner: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  repo: Scalars['String']['input'];
};

export type LinkGitlabProjectInput = {
  gitlabProjectId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Accept an invitation to join a team */
  acceptInvitation: Team;
  /** Add contributor to project */
  addOrUpdateProjectContributor: ProjectContributor;
  /** Create a team */
  createTeam: CreateTeamResult;
  /** Delete Project */
  deleteProject: Scalars['Boolean']['output'];
  /** Delete team and all its projects */
  deleteTeam: Scalars['Boolean']['output'];
  /** Disable GitHub SSO */
  disableGitHubSSOOnTeam: Team;
  /** Disconnect GitHub Account */
  disconnectGitHubAuth: Account;
  /** Disconnect GitLab Account */
  disconnectGitLabAuth: Account;
  /** Disconnect Google Account */
  disconnectGoogleAuth: Account;
  /** Enable GitHub SSO */
  enableGitHubSSOOnTeam: Team;
  /** Import a project from GitHub */
  importGithubProject: Project;
  /** Import a project from GitLab */
  importGitlabProject: Project;
  /** Leave a team */
  leaveTeam: Scalars['Boolean']['output'];
  /** Link GitHub Repository */
  linkGithubRepository: Project;
  /** Link Gitlab Project */
  linkGitlabProject: Project;
  ping: Scalars['Boolean']['output'];
  /** Regenerate project token */
  regenerateProjectToken: Project;
  removeContributorFromProject: RemoveContributorFromProjectPayload;
  /** Remove a user from a team */
  removeUserFromTeam: RemoveUserFromTeamPayload;
  /** Set team default user level */
  setTeamDefaultUserLevel: Team;
  /** Set member level */
  setTeamMemberLevel: TeamMember;
  /** Change the validationStatus on a build */
  setValidationStatus: Build;
  /** Transfer Project to another account */
  transferProject: Project;
  /** Uninstall Slack */
  uninstallSlack: Account;
  /** Unlink GitHub Repository */
  unlinkGithubRepository: Project;
  /** Unlink Gitlab Project */
  unlinkGitlabProject: Project;
  /** Update Account */
  updateAccount: Account;
  /** Update Project */
  updateProject: Project;
  /** Set project pull request comment */
  updateProjectPrComment: Project;
};


export type MutationAcceptInvitationArgs = {
  token: Scalars['String']['input'];
};


export type MutationAddOrUpdateProjectContributorArgs = {
  input: AddContributorToProjectInput;
};


export type MutationCreateTeamArgs = {
  input: CreateTeamInput;
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTeamArgs = {
  input: DeleteTeamInput;
};


export type MutationDisableGitHubSsoOnTeamArgs = {
  input: DisableGitHubSsoOnTeamInput;
};


export type MutationDisconnectGitHubAuthArgs = {
  input: DisconnectGitHubAuthInput;
};


export type MutationDisconnectGitLabAuthArgs = {
  input: DisconnectGitLabAuthInput;
};


export type MutationDisconnectGoogleAuthArgs = {
  input: DisconnectGoogleAuthInput;
};


export type MutationEnableGitHubSsoOnTeamArgs = {
  input: EnableGitHubSsoOnTeamInput;
};


export type MutationImportGithubProjectArgs = {
  input: ImportGithubProjectInput;
};


export type MutationImportGitlabProjectArgs = {
  input: ImportGitlabProjectInput;
};


export type MutationLeaveTeamArgs = {
  input: LeaveTeamInput;
};


export type MutationLinkGithubRepositoryArgs = {
  input: LinkGithubRepositoryInput;
};


export type MutationLinkGitlabProjectArgs = {
  input: LinkGitlabProjectInput;
};


export type MutationRegenerateProjectTokenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveContributorFromProjectArgs = {
  input: RemoveContributorFromProjectInput;
};


export type MutationRemoveUserFromTeamArgs = {
  input: RemoveUserFromTeamInput;
};


export type MutationSetTeamDefaultUserLevelArgs = {
  input: SetTeamDefaultUserLevelInput;
};


export type MutationSetTeamMemberLevelArgs = {
  input: SetTeamMemberLevelInput;
};


export type MutationSetValidationStatusArgs = {
  buildId: Scalars['ID']['input'];
  validationStatus: ValidationStatus;
};


export type MutationTransferProjectArgs = {
  input: TransferProjectInput;
};


export type MutationUninstallSlackArgs = {
  input: UninstallSlackInput;
};


export type MutationUnlinkGithubRepositoryArgs = {
  input: UnlinkGithubRepositoryInput;
};


export type MutationUnlinkGitlabProjectArgs = {
  input: UnlinkGitlabProjectInput;
};


export type MutationUpdateAccountArgs = {
  input: UpdateAccountInput;
};


export type MutationUpdateProjectArgs = {
  input: UpdateProjectInput;
};


export type MutationUpdateProjectPrCommentArgs = {
  input: UpdateProjectPrCommentInput;
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export type Plan = Node & {
  __typename?: 'Plan';
  displayName: Scalars['String']['output'];
  fineGrainedAccessControlIncluded: Scalars['Boolean']['output'];
  githubSsoIncluded: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  usageBased: Scalars['Boolean']['output'];
};

export type Project = Node & {
  __typename?: 'Project';
  /** Owner of the repository */
  account: Account;
  /** Glob pattern for auto-approved branches */
  autoApprovedBranchGlob: Scalars['String']['output'];
  /** A single build linked to the repository */
  build?: Maybe<Build>;
  /** Build names */
  buildNames: Array<Scalars['String']['output']>;
  /** Builds associated to the repository */
  builds: BuildConnection;
  /** Contributors */
  contributors: ProjectContributorConnection;
  /** Current month used screenshots */
  currentPeriodScreenshots: Scalars['Int']['output'];
  /** Glob pattern for auto-approved branches edited by the user */
  customAutoApprovedBranchGlob?: Maybe<Scalars['String']['output']>;
  /** Default base branch edited by the user */
  customDefaultBaseBranch?: Maybe<Scalars['String']['output']>;
  /** Default base branch */
  defaultBaseBranch: Scalars['String']['output'];
  /** Default user access level applied to members that are not contributors */
  defaultUserLevel?: Maybe<ProjectUserLevel>;
  id: Scalars['ID']['output'];
  /** Latest auto-approved build */
  latestAutoApprovedBuild?: Maybe<Build>;
  /** Latest build */
  latestBuild?: Maybe<Build>;
  name: Scalars['String']['output'];
  /** Determine permissions of the current user */
  permissions: Array<ProjectPermission>;
  /** Pull request comment enabled */
  prCommentEnabled: Scalars['Boolean']['output'];
  /** Override repository's Github privacy */
  private?: Maybe<Scalars['Boolean']['output']>;
  /** Check if the project is public or not */
  public: Scalars['Boolean']['output'];
  /** Repository associated to the project */
  repository?: Maybe<Repository>;
  /** Project slug */
  slug: Scalars['String']['output'];
  /** Summary check */
  summaryCheck: SummaryCheck;
  token?: Maybe<Scalars['String']['output']>;
  /** Total screenshots used */
  totalScreenshots: Scalars['Int']['output'];
};


export type ProjectBuildArgs = {
  number: Scalars['Int']['input'];
};


export type ProjectBuildsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  buildName?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectContributorsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export type ProjectConnection = Connection & {
  __typename?: 'ProjectConnection';
  edges: Array<Project>;
  pageInfo: PageInfo;
};

export type ProjectContributor = Node & {
  __typename?: 'ProjectContributor';
  id: Scalars['ID']['output'];
  level: ProjectUserLevel;
  project: Project;
  user: User;
};

export type ProjectContributorConnection = Connection & {
  __typename?: 'ProjectContributorConnection';
  edges: Array<ProjectContributor>;
  pageInfo: PageInfo;
};

export enum ProjectPermission {
  Admin = 'admin',
  Review = 'review',
  View = 'view',
  ViewSettings = 'view_settings'
}

export enum ProjectUserLevel {
  Admin = 'admin',
  Reviewer = 'reviewer',
  Viewer = 'viewer'
}

export type PullRequest = {
  closedAt?: Maybe<Scalars['DateTime']['output']>;
  date?: Maybe<Scalars['DateTime']['output']>;
  draft?: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  merged?: Maybe<Scalars['Boolean']['output']>;
  mergedAt?: Maybe<Scalars['DateTime']['output']>;
  number: Scalars['Int']['output'];
  state?: Maybe<PullRequestState>;
  title?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export enum PullRequestState {
  Closed = 'CLOSED',
  Open = 'OPEN'
}

export type Query = {
  __typename?: 'Query';
  /** Get Account by slug */
  account?: Maybe<Account>;
  /** Get Account by id */
  accountById?: Maybe<Account>;
  ghApiInstallationRepositories: GhApiRepositoryConnection;
  glApiProjects: GlApiProjectConnection;
  invitation?: Maybe<Team>;
  /** Get the authenticated user */
  me?: Maybe<User>;
  ping: Scalars['Boolean']['output'];
  /** Get a project */
  project?: Maybe<Project>;
  /** Get a project */
  projectById?: Maybe<Project>;
  /** Get Team by id */
  teamById?: Maybe<Team>;
};


export type QueryAccountArgs = {
  slug: Scalars['String']['input'];
};


export type QueryAccountByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGhApiInstallationRepositoriesArgs = {
  fromAuthUser: Scalars['Boolean']['input'];
  installationId: Scalars['ID']['input'];
  page: Scalars['Int']['input'];
  reposPerPage?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGlApiProjectsArgs = {
  accountId: Scalars['ID']['input'];
  allProjects: Scalars['Boolean']['input'];
  groupId?: InputMaybe<Scalars['ID']['input']>;
  page: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryInvitationArgs = {
  token: Scalars['String']['input'];
};


export type QueryProjectArgs = {
  accountSlug: Scalars['String']['input'];
  buildName?: InputMaybe<Scalars['String']['input']>;
  projectName: Scalars['String']['input'];
};


export type QueryProjectByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTeamByIdArgs = {
  id: Scalars['ID']['input'];
};

export type RemoveContributorFromProjectInput = {
  projectId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type RemoveContributorFromProjectPayload = {
  __typename?: 'RemoveContributorFromProjectPayload';
  projectContributorId: Scalars['ID']['output'];
};

export type RemoveUserFromTeamInput = {
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type RemoveUserFromTeamPayload = {
  __typename?: 'RemoveUserFromTeamPayload';
  teamMemberId: Scalars['ID']['output'];
};

export type Repository = {
  defaultBranch: Scalars['String']['output'];
  fullName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  private: Scalars['Boolean']['output'];
  url: Scalars['String']['output'];
};

export type Screenshot = Node & {
  __typename?: 'Screenshot';
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  metadata?: Maybe<ScreenshotMetadata>;
  playwrightTraceUrl?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

export type ScreenshotBucket = Node & {
  __typename?: 'ScreenshotBucket';
  branch?: Maybe<Scalars['String']['output']>;
  commit: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
};

export type ScreenshotDiff = Node & {
  __typename?: 'ScreenshotDiff';
  baseScreenshot?: Maybe<Screenshot>;
  compareScreenshot?: Maybe<Screenshot>;
  createdAt: Scalars['DateTime']['output'];
  group?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  status: ScreenshotDiffStatus;
  threshold?: Maybe<Scalars['Float']['output']>;
  url?: Maybe<Scalars['String']['output']>;
  validationStatus?: Maybe<Scalars['String']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

export type ScreenshotDiffConnection = Connection & {
  __typename?: 'ScreenshotDiffConnection';
  edges: Array<ScreenshotDiff>;
  pageInfo: PageInfo;
};

export enum ScreenshotDiffStatus {
  Added = 'added',
  Changed = 'changed',
  Failure = 'failure',
  Pending = 'pending',
  Removed = 'removed',
  RetryFailure = 'retryFailure',
  Unchanged = 'unchanged'
}

export type ScreenshotMetadata = {
  __typename?: 'ScreenshotMetadata';
  automationLibrary: ScreenshotMetadataAutomationLibrary;
  browser?: Maybe<ScreenshotMetadataBrowser>;
  colorScheme?: Maybe<ScreenshotMetadataColorScheme>;
  mediaType?: Maybe<ScreenshotMetadataMediaType>;
  sdk: ScreenshotMetadataSdk;
  test?: Maybe<ScreenshotMetadataTest>;
  url?: Maybe<Scalars['String']['output']>;
  viewport?: Maybe<ScreenshotMetadataViewport>;
};

export type ScreenshotMetadataAutomationLibrary = {
  __typename?: 'ScreenshotMetadataAutomationLibrary';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type ScreenshotMetadataBrowser = {
  __typename?: 'ScreenshotMetadataBrowser';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export enum ScreenshotMetadataColorScheme {
  Dark = 'dark',
  Light = 'light'
}

export type ScreenshotMetadataLocation = {
  __typename?: 'ScreenshotMetadataLocation';
  column: Scalars['Int']['output'];
  file: Scalars['String']['output'];
  line: Scalars['Int']['output'];
};

export enum ScreenshotMetadataMediaType {
  Print = 'print',
  Screen = 'screen'
}

export type ScreenshotMetadataSdk = {
  __typename?: 'ScreenshotMetadataSDK';
  name: Scalars['String']['output'];
  version: Scalars['String']['output'];
};

export type ScreenshotMetadataTest = {
  __typename?: 'ScreenshotMetadataTest';
  id?: Maybe<Scalars['String']['output']>;
  location?: Maybe<ScreenshotMetadataLocation>;
  repeat?: Maybe<Scalars['Int']['output']>;
  retries?: Maybe<Scalars['Int']['output']>;
  retry?: Maybe<Scalars['Int']['output']>;
  title: Scalars['String']['output'];
  titlePath: Array<Scalars['String']['output']>;
};

export type ScreenshotMetadataViewport = {
  __typename?: 'ScreenshotMetadataViewport';
  height: Scalars['Int']['output'];
  width: Scalars['Int']['output'];
};

export type SetTeamDefaultUserLevelInput = {
  level: TeamDefaultUserLevel;
  teamAccountId: Scalars['ID']['input'];
};

export type SetTeamMemberLevelInput = {
  level: TeamUserLevel;
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type SlackInstallation = Node & {
  __typename?: 'SlackInstallation';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  teamDomain: Scalars['String']['output'];
  teamName: Scalars['String']['output'];
};

export enum SummaryCheck {
  Always = 'always',
  Auto = 'auto',
  Never = 'never'
}

export type Team = Account & Node & {
  __typename?: 'Team';
  avatar: AccountAvatar;
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  defaultUserLevel: TeamDefaultUserLevel;
  githubAccount?: Maybe<GithubAccount>;
  githubLightInstallation?: Maybe<GithubInstallation>;
  githubMembers?: Maybe<TeamGithubMemberConnection>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  gitlabBaseUrl?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<GlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  inviteLink?: Maybe<Scalars['String']['output']>;
  me?: Maybe<TeamMember>;
  members: TeamMemberConnection;
  metrics: AccountMetrics;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidSubscription?: Maybe<AccountSubscription>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<AccountPermission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  slackInstallation?: Maybe<SlackInstallation>;
  slug: Scalars['String']['output'];
  ssoGithubAccount?: Maybe<GithubAccount>;
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<AccountSubscription>;
  subscriptionStatus?: Maybe<AccountSubscriptionStatus>;
};


export type TeamGithubMembersArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type TeamMembersArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  levels?: InputMaybe<Array<TeamUserLevel>>;
  search?: InputMaybe<Scalars['String']['input']>;
  sso?: InputMaybe<Scalars['Boolean']['input']>;
};


export type TeamMetricsArgs = {
  input: AccountMetricsInput;
};


export type TeamProjectsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};

export enum TeamDefaultUserLevel {
  Contributor = 'contributor',
  Member = 'member'
}

export type TeamGithubMember = Node & {
  __typename?: 'TeamGithubMember';
  githubAccount: GithubAccount;
  id: Scalars['ID']['output'];
  teamMember?: Maybe<TeamMember>;
};

export type TeamGithubMemberConnection = Connection & {
  __typename?: 'TeamGithubMemberConnection';
  edges: Array<TeamGithubMember>;
  pageInfo: PageInfo;
};

export type TeamMember = Node & {
  __typename?: 'TeamMember';
  id: Scalars['ID']['output'];
  level: TeamUserLevel;
  user: User;
};

export type TeamMemberConnection = Connection & {
  __typename?: 'TeamMemberConnection';
  edges: Array<TeamMember>;
  pageInfo: PageInfo;
};

export enum TeamUserLevel {
  Contributor = 'contributor',
  Member = 'member',
  Owner = 'owner'
}

export type TestReport = {
  __typename?: 'TestReport';
  stats?: Maybe<TestReportStats>;
  status: TestReportStatus;
};

export type TestReportStats = {
  __typename?: 'TestReportStats';
  duration?: Maybe<Scalars['Int']['output']>;
  startTime?: Maybe<Scalars['DateTime']['output']>;
};

export enum TestReportStatus {
  Failed = 'failed',
  Interrupted = 'interrupted',
  Passed = 'passed',
  Timedout = 'timedout'
}

export enum TimeSeriesGroupBy {
  Day = 'day',
  Month = 'month',
  Week = 'week'
}

export type TransferProjectInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  targetAccountId: Scalars['ID']['input'];
};

export type UninstallSlackInput = {
  accountId: Scalars['ID']['input'];
};

export type UnlinkGithubRepositoryInput = {
  projectId: Scalars['ID']['input'];
};

export type UnlinkGitlabProjectInput = {
  projectId: Scalars['ID']['input'];
};

export type UpdateAccountInput = {
  gitlabAccessToken?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  autoApprovedBranchGlob?: InputMaybe<Scalars['String']['input']>;
  defaultBaseBranch?: InputMaybe<Scalars['String']['input']>;
  defaultUserLevel?: InputMaybe<ProjectUserLevel>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  summaryCheck?: InputMaybe<SummaryCheck>;
};

export type UpdateProjectPrCommentInput = {
  enabled: Scalars['Boolean']['input'];
  projectId: Scalars['ID']['input'];
};

export type User = Account & Node & {
  __typename?: 'User';
  avatar: AccountAvatar;
  consumptionRatio: Scalars['Float']['output'];
  currentPeriodScreenshots: Scalars['Int']['output'];
  email?: Maybe<Scalars['String']['output']>;
  ghInstallations: GhApiInstallationConnection;
  githubAccount?: Maybe<GithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  gitlabBaseUrl?: Maybe<Scalars['String']['output']>;
  gitlabUser?: Maybe<GitlabUser>;
  glNamespaces?: Maybe<GlApiNamespaceConnection>;
  googleUser?: Maybe<GoogleUser>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasSubscribedToTrial: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  includedScreenshots: Scalars['Int']['output'];
  lastSubscription?: Maybe<AccountSubscription>;
  metrics: AccountMetrics;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidSubscription?: Maybe<AccountSubscription>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<AccountPermission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  projectsContributedOn: ProjectContributorConnection;
  slackInstallation?: Maybe<SlackInstallation>;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  subscription?: Maybe<AccountSubscription>;
  subscriptionStatus?: Maybe<AccountSubscriptionStatus>;
  teams: Array<Team>;
};


export type UserMetricsArgs = {
  input: AccountMetricsInput;
};


export type UserProjectsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type UserProjectsContributedOnArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
};

export type UserConnection = Connection & {
  __typename?: 'UserConnection';
  edges: Array<User>;
  pageInfo: PageInfo;
};

export enum ValidationStatus {
  Accepted = 'accepted',
  Rejected = 'rejected',
  Unknown = 'unknown'
}

type AccountChangeName_Account_Team_Fragment = { __typename?: 'Team', id: string, name?: string | null, slug: string } & { ' $fragmentName'?: 'AccountChangeName_Account_Team_Fragment' };

type AccountChangeName_Account_User_Fragment = { __typename?: 'User', id: string, name?: string | null, slug: string } & { ' $fragmentName'?: 'AccountChangeName_Account_User_Fragment' };

export type AccountChangeName_AccountFragment = AccountChangeName_Account_Team_Fragment | AccountChangeName_Account_User_Fragment;

export type AccountChangeName_UpdateAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type AccountChangeName_UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Team', id: string, name?: string | null } | { __typename?: 'User', id: string, name?: string | null } };

type AccountChangeSlug_Account_Team_Fragment = { __typename?: 'Team', id: string, slug: string } & { ' $fragmentName'?: 'AccountChangeSlug_Account_Team_Fragment' };

type AccountChangeSlug_Account_User_Fragment = { __typename?: 'User', id: string, slug: string } & { ' $fragmentName'?: 'AccountChangeSlug_Account_User_Fragment' };

export type AccountChangeSlug_AccountFragment = AccountChangeSlug_Account_Team_Fragment | AccountChangeSlug_Account_User_Fragment;

export type AccountChangeSlug_UpdateAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  slug: Scalars['String']['input'];
}>;


export type AccountChangeSlug_UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } };

type AccountGitLab_Account_Team_Fragment = { __typename?: 'Team', id: string, permissions: Array<AccountPermission>, gitlabAccessToken?: string | null, gitlabBaseUrl?: string | null } & { ' $fragmentName'?: 'AccountGitLab_Account_Team_Fragment' };

type AccountGitLab_Account_User_Fragment = { __typename?: 'User', id: string, permissions: Array<AccountPermission>, gitlabAccessToken?: string | null, gitlabBaseUrl?: string | null } & { ' $fragmentName'?: 'AccountGitLab_Account_User_Fragment' };

export type AccountGitLab_AccountFragment = AccountGitLab_Account_Team_Fragment | AccountGitLab_Account_User_Fragment;

export type AccountGitLab_UpdateAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  gitlabAccessToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type AccountGitLab_UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Team', id: string, gitlabAccessToken?: string | null } | { __typename?: 'User', id: string, gitlabAccessToken?: string | null } };

export type AccountAvatarFragmentFragment = { __typename?: 'AccountAvatar', url?: string | null, color: string, initial: string } & { ' $fragmentName'?: 'AccountAvatarFragmentFragment' };

type AccountItem_Account_Team_Fragment = (
  { __typename?: 'Team', id: string, slug: string, name?: string | null, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) }
  & { ' $fragmentRefs'?: { 'AccountPlanChip_Account_Team_Fragment': AccountPlanChip_Account_Team_Fragment } }
) & { ' $fragmentName'?: 'AccountItem_Account_Team_Fragment' };

type AccountItem_Account_User_Fragment = (
  { __typename?: 'User', id: string, slug: string, name?: string | null, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) }
  & { ' $fragmentRefs'?: { 'AccountPlanChip_Account_User_Fragment': AccountPlanChip_Account_User_Fragment } }
) & { ' $fragmentName'?: 'AccountItem_Account_User_Fragment' };

export type AccountItem_AccountFragment = AccountItem_Account_Team_Fragment | AccountItem_Account_User_Fragment;

type AccountPlanChip_Account_Team_Fragment = { __typename?: 'Team', subscriptionStatus?: AccountSubscriptionStatus | null, plan?: { __typename?: 'Plan', id: string, displayName: string } | null } & { ' $fragmentName'?: 'AccountPlanChip_Account_Team_Fragment' };

type AccountPlanChip_Account_User_Fragment = { __typename?: 'User', subscriptionStatus?: AccountSubscriptionStatus | null, plan?: { __typename?: 'Plan', id: string, displayName: string } | null } & { ' $fragmentName'?: 'AccountPlanChip_Account_User_Fragment' };

export type AccountPlanChip_AccountFragment = AccountPlanChip_Account_Team_Fragment | AccountPlanChip_Account_User_Fragment;

export type AccountBreadcrumb_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type AccountBreadcrumb_AccountQuery = { __typename?: 'Query', account?: (
    { __typename?: 'Team', id: string, slug: string, name?: string | null, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) }
    & { ' $fragmentRefs'?: { 'AccountPlanChip_Account_Team_Fragment': AccountPlanChip_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, slug: string, name?: string | null, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) }
    & { ' $fragmentRefs'?: { 'AccountPlanChip_Account_User_Fragment': AccountPlanChip_Account_User_Fragment } }
  ) | null };

type AccountBreadcrumbMenu_Account_Team_Fragment = (
  { __typename?: 'Team', id: string, slug: string }
  & { ' $fragmentRefs'?: { 'AccountItem_Account_Team_Fragment': AccountItem_Account_Team_Fragment } }
) & { ' $fragmentName'?: 'AccountBreadcrumbMenu_Account_Team_Fragment' };

type AccountBreadcrumbMenu_Account_User_Fragment = (
  { __typename?: 'User', id: string, slug: string }
  & { ' $fragmentRefs'?: { 'AccountItem_Account_User_Fragment': AccountItem_Account_User_Fragment } }
) & { ' $fragmentName'?: 'AccountBreadcrumbMenu_Account_User_Fragment' };

export type AccountBreadcrumbMenu_AccountFragment = AccountBreadcrumbMenu_Account_Team_Fragment | AccountBreadcrumbMenu_Account_User_Fragment;

export type AccountBreadcrumbMenu_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type AccountBreadcrumbMenu_MeQuery = { __typename?: 'Query', me?: (
    { __typename?: 'User', id: string, teams: Array<(
      { __typename?: 'Team', id: string }
      & { ' $fragmentRefs'?: { 'AccountBreadcrumbMenu_Account_Team_Fragment': AccountBreadcrumbMenu_Account_Team_Fragment } }
    )> }
    & { ' $fragmentRefs'?: { 'AccountBreadcrumbMenu_Account_User_Fragment': AccountBreadcrumbMenu_Account_User_Fragment } }
  ) | null };

export type ProjectBreadcrumbMenu_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type ProjectBreadcrumbMenu_AccountQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string }> } } | { __typename?: 'User', id: string, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string }> } } | null };

export type BuildStatusChip_BuildFragment = (
  { __typename?: 'Build', type?: BuildType | null, status: BuildStatus }
  & { ' $fragmentRefs'?: { 'BuildStatusDescription_BuildFragment': BuildStatusDescription_BuildFragment } }
) & { ' $fragmentName'?: 'BuildStatusChip_BuildFragment' };

export type BuildStatusDescription_BuildFragment = { __typename?: 'Build', type?: BuildType | null, status: BuildStatus, mode: BuildMode, baseBranch?: string | null, stats?: { __typename?: 'BuildStats', total: number } | null, parallel?: { __typename?: 'BuildParallel', total: number, received: number, nonce: string } | null } & { ' $fragmentName'?: 'BuildStatusDescription_BuildFragment' };

export type GithubAccountLink_GithubAccountFragment = { __typename?: 'GithubAccount', login: string, name?: string | null, url: string } & { ' $fragmentName'?: 'GithubAccountLink_GithubAccountFragment' };

export type GithubInstallationsSelect_GhApiInstallationFragment = { __typename?: 'GhApiInstallation', id: string, account: { __typename?: 'GhApiInstallationAccount', id: string, login: string, name?: string | null } } & { ' $fragmentName'?: 'GithubInstallationsSelect_GhApiInstallationFragment' };

export type GithubRepositoryList_GhApiInstallationRepositoriesQueryVariables = Exact<{
  installationId: Scalars['ID']['input'];
  page: Scalars['Int']['input'];
  reposPerPage?: InputMaybe<Scalars['Int']['input']>;
  fromAuthUser: Scalars['Boolean']['input'];
}>;


export type GithubRepositoryList_GhApiInstallationRepositoriesQuery = { __typename?: 'Query', ghApiInstallationRepositories: { __typename?: 'GhApiRepositoryConnection', edges: Array<{ __typename?: 'GhApiRepository', id: string, name: string, updated_at: string, owner_login: string }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, totalCount: number } } };

export type GitlabNamespacesSelect_GlApiNamespaceFragment = { __typename?: 'GlApiNamespace', id: string, name: string, path: string } & { ' $fragmentName'?: 'GitlabNamespacesSelect_GlApiNamespaceFragment' };

export type GitlabProjectList_GlApiProjectsQueryVariables = Exact<{
  accountId: Scalars['ID']['input'];
  userId?: InputMaybe<Scalars['ID']['input']>;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  allProjects: Scalars['Boolean']['input'];
  page: Scalars['Int']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type GitlabProjectList_GlApiProjectsQuery = { __typename?: 'Query', glApiProjects: { __typename?: 'GlApiProjectConnection', edges: Array<{ __typename?: 'GlApiProject', id: string, name: string, last_activity_at: string }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean } } };

export type NavUserControl_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type NavUserControl_AccountQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) } | { __typename?: 'User', id: string, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) } | null };

type PaymentBanner_Account_Team_Fragment = { __typename?: 'Team', id: string, subscriptionStatus?: AccountSubscriptionStatus | null, permissions: Array<AccountPermission>, stripeCustomerId?: string | null, subscription?: { __typename?: 'AccountSubscription', id: string, trialDaysRemaining?: number | null, endDate?: any | null } | null } & { ' $fragmentName'?: 'PaymentBanner_Account_Team_Fragment' };

type PaymentBanner_Account_User_Fragment = { __typename?: 'User', id: string, subscriptionStatus?: AccountSubscriptionStatus | null, permissions: Array<AccountPermission>, stripeCustomerId?: string | null, subscription?: { __typename?: 'AccountSubscription', id: string, trialDaysRemaining?: number | null, endDate?: any | null } | null } & { ' $fragmentName'?: 'PaymentBanner_Account_User_Fragment' };

export type PaymentBanner_AccountFragment = PaymentBanner_Account_Team_Fragment | PaymentBanner_Account_User_Fragment;

export type PaymentBanner_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentBanner_MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, hasSubscribedToTrial: boolean } | null };

type PlanCard_Account_Team_Fragment = (
  { __typename: 'Team', id: string, stripeCustomerId?: string | null, periodStartDate?: any | null, periodEndDate?: any | null, subscriptionStatus?: AccountSubscriptionStatus | null, hasForcedPlan: boolean, includedScreenshots: number, plan?: { __typename?: 'Plan', id: string, displayName: string } | null, subscription?: { __typename?: 'AccountSubscription', id: string, paymentMethodFilled: boolean, trialDaysRemaining?: number | null, endDate?: any | null, provider: AccountSubscriptionProvider } | null, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string, public: boolean, currentPeriodScreenshots: number }> } }
  & { ' $fragmentRefs'?: { 'AccountPlanChip_Account_Team_Fragment': AccountPlanChip_Account_Team_Fragment } }
) & { ' $fragmentName'?: 'PlanCard_Account_Team_Fragment' };

type PlanCard_Account_User_Fragment = (
  { __typename: 'User', id: string, stripeCustomerId?: string | null, periodStartDate?: any | null, periodEndDate?: any | null, subscriptionStatus?: AccountSubscriptionStatus | null, hasForcedPlan: boolean, includedScreenshots: number, plan?: { __typename?: 'Plan', id: string, displayName: string } | null, subscription?: { __typename?: 'AccountSubscription', id: string, paymentMethodFilled: boolean, trialDaysRemaining?: number | null, endDate?: any | null, provider: AccountSubscriptionProvider } | null, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string, public: boolean, currentPeriodScreenshots: number }> } }
  & { ' $fragmentRefs'?: { 'AccountPlanChip_Account_User_Fragment': AccountPlanChip_Account_User_Fragment } }
) & { ' $fragmentName'?: 'PlanCard_Account_User_Fragment' };

export type PlanCard_AccountFragment = PlanCard_Account_Team_Fragment | PlanCard_Account_User_Fragment;

export type ProjectBadge_ProjectFragment = { __typename?: 'Project', id: string, slug: string } & { ' $fragmentName'?: 'ProjectBadge_ProjectFragment' };

export type ProjectBranches_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  defaultBaseBranch?: InputMaybe<Scalars['String']['input']>;
  autoApprovedBranchGlob?: InputMaybe<Scalars['String']['input']>;
}>;


export type ProjectBranches_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, customDefaultBaseBranch?: string | null, customAutoApprovedBranchGlob?: string | null } };

export type ProjectBranches_ProjectFragment = { __typename?: 'Project', id: string, customDefaultBaseBranch?: string | null, customAutoApprovedBranchGlob?: string | null, repository?: { __typename: 'GithubRepository', id: string, defaultBranch: string } | { __typename: 'GitlabProject', id: string, defaultBranch: string } | null } & { ' $fragmentName'?: 'ProjectBranches_ProjectFragment' };

export type ProjectChangeName_ProjectFragment = { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } & { ' $fragmentName'?: 'ProjectChangeName_ProjectFragment' };

export type ProjectChangeName_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type ProjectChangeName_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, name: string } };

export type ConnectRepositoryQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
}>;


export type ConnectRepositoryQuery = { __typename?: 'Query', account?: { __typename: 'Team', id: string, gitlabAccessToken?: string | null, permissions: Array<AccountPermission>, githubLightInstallation?: { __typename?: 'GithubInstallation', id: string, ghInstallation?: (
        { __typename?: 'GhApiInstallation', id: string }
        & { ' $fragmentRefs'?: { 'GithubInstallationsSelect_GhApiInstallationFragment': GithubInstallationsSelect_GhApiInstallationFragment } }
      ) | null } | null, glNamespaces?: { __typename?: 'GlApiNamespaceConnection', edges: Array<(
        { __typename?: 'GlApiNamespace', id: string, kind: string, isProjectToken: boolean }
        & { ' $fragmentRefs'?: { 'GitlabNamespacesSelect_GlApiNamespaceFragment': GitlabNamespacesSelect_GlApiNamespaceFragment } }
      )> } | null } | { __typename: 'User', id: string, gitlabAccessToken?: string | null, permissions: Array<AccountPermission>, glNamespaces?: { __typename?: 'GlApiNamespaceConnection', edges: Array<(
        { __typename?: 'GlApiNamespace', id: string, kind: string, isProjectToken: boolean }
        & { ' $fragmentRefs'?: { 'GitlabNamespacesSelect_GlApiNamespaceFragment': GitlabNamespacesSelect_GlApiNamespaceFragment } }
      )> } | null } | null, me?: { __typename?: 'User', id: string, githubAccount?: { __typename?: 'GithubAccount', id: string } | null, ghInstallations: { __typename?: 'GhApiInstallationConnection', edges: Array<(
        { __typename?: 'GhApiInstallation', id: string }
        & { ' $fragmentRefs'?: { 'GithubInstallationsSelect_GhApiInstallationFragment': GithubInstallationsSelect_GhApiInstallationFragment } }
      )>, pageInfo: { __typename?: 'PageInfo', totalCount: number } } } | null };

export type ProjectContributors_ProjectFragment = (
  { __typename?: 'Project', id: string, name: string, permissions: Array<ProjectPermission>, defaultUserLevel?: ProjectUserLevel | null, account: { __typename?: 'Team', id: string } | { __typename?: 'User', id: string } }
  & { ' $fragmentRefs'?: { 'ProjectDefaultUserLevel_ProjectFragment': ProjectDefaultUserLevel_ProjectFragment } }
) & { ' $fragmentName'?: 'ProjectContributors_ProjectFragment' };

export type ProjectContributors_TeamContributorsQueryVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProjectContributors_TeamContributorsQuery = { __typename?: 'Query', team?: { __typename?: 'Team', id: string, members: { __typename?: 'TeamMemberConnection', edges: Array<{ __typename?: 'TeamMember', id: string, user: (
          { __typename?: 'User', id: string }
          & { ' $fragmentRefs'?: { 'ContributorListRow_UserFragment': ContributorListRow_UserFragment } }
        ) }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean } } } | null };

export type ContributorListRow_UserFragment = (
  { __typename?: 'User', id: string, projectsContributedOn: { __typename?: 'ProjectContributorConnection', edges: Array<{ __typename?: 'ProjectContributor', id: string, level: ProjectUserLevel }> } }
  & { ' $fragmentRefs'?: { 'UserListRow_UserFragment': UserListRow_UserFragment } }
) & { ' $fragmentName'?: 'ContributorListRow_UserFragment' };

export type ProjectAddOrUpdateContributorMutationMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
  level: ProjectUserLevel;
}>;


export type ProjectAddOrUpdateContributorMutationMutation = { __typename?: 'Mutation', addOrUpdateProjectContributor: { __typename?: 'ProjectContributor', id: string, level: ProjectUserLevel } };

export type ProjectContributorsQueryQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProjectContributorsQueryQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, contributors: { __typename?: 'ProjectContributorConnection', edges: Array<{ __typename?: 'ProjectContributor', id: string, level: ProjectUserLevel, user: (
          { __typename?: 'User', id: string }
          & { ' $fragmentRefs'?: { 'UserListRow_UserFragment': UserListRow_UserFragment } }
        ) }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean } } } | null };

export type ProjectDefaultUserLevel_ProjectFragment = { __typename?: 'Project', id: string, defaultUserLevel?: ProjectUserLevel | null } & { ' $fragmentName'?: 'ProjectDefaultUserLevel_ProjectFragment' };

export type ProjectDefaultUserLevel_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  defaultUserLevel?: InputMaybe<ProjectUserLevel>;
}>;


export type ProjectDefaultUserLevel_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, defaultUserLevel?: ProjectUserLevel | null } };

export type RemoveContributorFromProjectMutationMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
}>;


export type RemoveContributorFromProjectMutationMutation = { __typename?: 'Mutation', removeContributorFromProject: { __typename?: 'RemoveContributorFromProjectPayload', projectContributorId: string } };

export type RemoveFromProjectDialog_UserFragment = (
  { __typename?: 'User', id: string }
  & { ' $fragmentRefs'?: { 'UserListRow_UserFragment': UserListRow_UserFragment } }
) & { ' $fragmentName'?: 'RemoveFromProjectDialog_UserFragment' };

export type ProjectContributors_TeamMembersQueryVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProjectContributors_TeamMembersQuery = { __typename?: 'Query', team?: { __typename?: 'Team', id: string, members: { __typename?: 'TeamMemberConnection', edges: Array<{ __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: (
          { __typename?: 'User', id: string }
          & { ' $fragmentRefs'?: { 'UserListRow_UserFragment': UserListRow_UserFragment } }
        ) }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean } } } | null };

export type ProjectContributedOnFragmentFragment = { __typename?: 'User', projectsContributedOn: { __typename?: 'ProjectContributorConnection', edges: Array<{ __typename: 'ProjectContributor', id: string, level: ProjectUserLevel }> } } & { ' $fragmentName'?: 'ProjectContributedOnFragmentFragment' };

export type DeleteProjectMutationMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type DeleteProjectMutationMutation = { __typename?: 'Mutation', deleteProject: boolean };

export type ProjectDelete_ProjectFragment = { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } & { ' $fragmentName'?: 'ProjectDelete_ProjectFragment' };

export type ProjectGitRepository_ProjectFragment = { __typename?: 'Project', id: string, prCommentEnabled: boolean, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string }, repository?: { __typename: 'GithubRepository', id: string, fullName: string, url: string } | { __typename: 'GitlabProject', id: string, fullName: string, url: string } | null } & { ' $fragmentName'?: 'ProjectGitRepository_ProjectFragment' };

export type ProjectGitRepository_LinkGithubRepositoryMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  repo: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  app: GitHubAppType;
}>;


export type ProjectGitRepository_LinkGithubRepositoryMutation = { __typename?: 'Mutation', linkGithubRepository: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) };

export type ProjectGitRepository_UnlinkGithubRepositoryMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type ProjectGitRepository_UnlinkGithubRepositoryMutation = { __typename?: 'Mutation', unlinkGithubRepository: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) };

export type ProjectGitRepository_LinkGitlabProjectMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  gitlabProjectId: Scalars['ID']['input'];
}>;


export type ProjectGitRepository_LinkGitlabProjectMutation = { __typename?: 'Mutation', linkGitlabProject: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) };

export type ProjectGitRepository_UnlinkGitlabProjectMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type ProjectGitRepository_UnlinkGitlabProjectMutation = { __typename?: 'Mutation', unlinkGitlabProject: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) };

export type ProjectGitRepository_UpdateEnablePrCommentMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  enabled: Scalars['Boolean']['input'];
}>;


export type ProjectGitRepository_UpdateEnablePrCommentMutation = { __typename?: 'Mutation', updateProjectPrComment: { __typename?: 'Project', id: string, prCommentEnabled: boolean } };

export type ProjectStatusChecks_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  summaryCheck?: InputMaybe<SummaryCheck>;
}>;


export type ProjectStatusChecks_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, summaryCheck: SummaryCheck } };

export type ProjectStatusChecks_ProjectFragment = { __typename?: 'Project', id: string, summaryCheck: SummaryCheck } & { ' $fragmentName'?: 'ProjectStatusChecks_ProjectFragment' };

export type ProjectToken_ProjectFragment = { __typename?: 'Project', id: string, token?: string | null, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } & { ' $fragmentName'?: 'ProjectToken_ProjectFragment' };

export type RegenerateTokenMutationMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
}>;


export type RegenerateTokenMutationMutation = { __typename?: 'Mutation', regenerateProjectToken: { __typename?: 'Project', id: string, token?: string | null } };

export type TransferProject_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type TransferProject_MeQuery = { __typename?: 'Query', me?: (
    { __typename?: 'User', id: string, teams: Array<(
      { __typename?: 'Team', id: string }
      & { ' $fragmentRefs'?: { 'AccountItem_Account_Team_Fragment': AccountItem_Account_Team_Fragment } }
    )> }
    & { ' $fragmentRefs'?: { 'AccountItem_Account_User_Fragment': AccountItem_Account_User_Fragment } }
  ) | null };

type ProjectTransfer_Account_Team_Fragment = { __typename?: 'Team', id: string, name?: string | null, slug: string, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) } & { ' $fragmentName'?: 'ProjectTransfer_Account_Team_Fragment' };

type ProjectTransfer_Account_User_Fragment = { __typename?: 'User', id: string, name?: string | null, slug: string, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) } & { ' $fragmentName'?: 'ProjectTransfer_Account_User_Fragment' };

export type ProjectTransfer_AccountFragment = ProjectTransfer_Account_Team_Fragment | ProjectTransfer_Account_User_Fragment;

export type ProjectTransfer_ReviewQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  actualAccountId: Scalars['ID']['input'];
  targetAccountId: Scalars['ID']['input'];
}>;


export type ProjectTransfer_ReviewQuery = { __typename?: 'Query', projectById?: { __typename?: 'Project', id: string, totalScreenshots: number, builds: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number } } } | null, actualAccount?: (
    { __typename?: 'Team', id: string, plan?: { __typename?: 'Plan', id: string, displayName: string } | null }
    & { ' $fragmentRefs'?: { 'ProjectTransfer_Account_Team_Fragment': ProjectTransfer_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, plan?: { __typename?: 'Plan', id: string, displayName: string } | null }
    & { ' $fragmentRefs'?: { 'ProjectTransfer_Account_User_Fragment': ProjectTransfer_Account_User_Fragment } }
  ) | null, targetAccount?: (
    { __typename?: 'Team', id: string, plan?: { __typename?: 'Plan', id: string, displayName: string } | null }
    & { ' $fragmentRefs'?: { 'ProjectTransfer_Account_Team_Fragment': ProjectTransfer_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, plan?: { __typename?: 'Plan', id: string, displayName: string } | null }
    & { ' $fragmentRefs'?: { 'ProjectTransfer_Account_User_Fragment': ProjectTransfer_Account_User_Fragment } }
  ) | null };

export type ProjectTransfer_TransferProjectMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  targetAccountId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type ProjectTransfer_TransferProjectMutation = { __typename?: 'Mutation', transferProject: { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, name?: string | null, slug: string } | { __typename?: 'User', id: string, name?: string | null, slug: string } } };

export type ProjectTransfer_ProjectFragment = { __typename?: 'Project', id: string, name: string, slug: string, account: { __typename?: 'Team', id: string, name?: string | null, slug: string } | { __typename?: 'User', id: string, name?: string | null, slug: string } } & { ' $fragmentName'?: 'ProjectTransfer_ProjectFragment' };

export type ProjectVisibility_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  private?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ProjectVisibility_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, private?: boolean | null } };

export type ProjectVisibility_ProjectFragment = { __typename?: 'Project', id: string, private?: boolean | null, repository?: { __typename: 'GithubRepository', id: string, private: boolean } | { __typename: 'GitlabProject', id: string, private: boolean } | null } & { ' $fragmentName'?: 'ProjectVisibility_ProjectFragment' };

export type ProjectList_ProjectFragment = { __typename?: 'Project', id: string, name: string, slug: string, account: { __typename?: 'Team', id: string, slug: string, name?: string | null, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) } | { __typename?: 'User', id: string, slug: string, name?: string | null, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) }, repository?: { __typename: 'GithubRepository', id: string, fullName: string } | { __typename: 'GitlabProject', id: string, fullName: string } | null, latestBuild?: { __typename?: 'Build', id: string, createdAt: any } | null } & { ' $fragmentName'?: 'ProjectList_ProjectFragment' };

export type PullRequestStatusIcon_PullRequestFragment = { __typename?: 'GithubPullRequest', draft?: boolean | null, merged?: boolean | null, state?: PullRequestState | null } & { ' $fragmentName'?: 'PullRequestStatusIcon_PullRequestFragment' };

export type PullRequestInfo_PullRequestFragment = (
  { __typename?: 'GithubPullRequest', title?: string | null, draft?: boolean | null, merged?: boolean | null, mergedAt?: any | null, closedAt?: any | null, state?: PullRequestState | null, number: number, date?: any | null, url: string, creator?: { __typename?: 'GithubAccount', id: string, login: string, name?: string | null } | null }
  & { ' $fragmentRefs'?: { 'PullRequestStatusIcon_PullRequestFragment': PullRequestStatusIcon_PullRequestFragment } }
) & { ' $fragmentName'?: 'PullRequestInfo_PullRequestFragment' };

export type PullRequestButton_PullRequestFragment = (
  { __typename?: 'GithubPullRequest', title?: string | null, number: number, url: string }
  & { ' $fragmentRefs'?: { 'PullRequestStatusIcon_PullRequestFragment': PullRequestStatusIcon_PullRequestFragment;'PullRequestInfo_PullRequestFragment': PullRequestInfo_PullRequestFragment } }
) & { ' $fragmentName'?: 'PullRequestButton_PullRequestFragment' };

export type TeamAccessRole_TeamFragment = { __typename?: 'Team', id: string, defaultUserLevel: TeamDefaultUserLevel } & { ' $fragmentName'?: 'TeamAccessRole_TeamFragment' };

export type TeamAccessUserLevel_SetTeamDefaultUserLevelMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  level: TeamDefaultUserLevel;
}>;


export type TeamAccessUserLevel_SetTeamDefaultUserLevelMutation = { __typename?: 'Mutation', setTeamDefaultUserLevel: (
    { __typename?: 'Team' }
    & { ' $fragmentRefs'?: { 'TeamAccessRole_TeamFragment': TeamAccessRole_TeamFragment } }
  ) };

export type TeamDelete_TeamFragment = { __typename?: 'Team', id: string, slug: string, subscription?: { __typename?: 'AccountSubscription', id: string, status: AccountSubscriptionStatus, endDate?: any | null } | null } & { ' $fragmentName'?: 'TeamDelete_TeamFragment' };

export type DeleteTeamMutationMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
}>;


export type DeleteTeamMutationMutation = { __typename?: 'Mutation', deleteTeam: boolean };

export type TeamGitHubLight_TeamFragment = { __typename?: 'Team', id: string, githubLightInstallation?: { __typename?: 'GithubInstallation', id: string, ghAccount?: { __typename?: 'GhApiInstallationAccount', id: string, login: string, name?: string | null, url: string } | null } | null } & { ' $fragmentName'?: 'TeamGitHubLight_TeamFragment' };

export type TeamGitHubSso_TeamFragment = { __typename?: 'Team', id: string, subscriptionStatus?: AccountSubscriptionStatus | null, plan?: { __typename?: 'Plan', id: string, displayName: string, usageBased: boolean, githubSsoIncluded: boolean } | null, ssoGithubAccount?: (
    { __typename?: 'GithubAccount', id: string }
    & { ' $fragmentRefs'?: { 'GithubAccountLink_GithubAccountFragment': GithubAccountLink_GithubAccountFragment } }
  ) | null } & { ' $fragmentName'?: 'TeamGitHubSso_TeamFragment' };

export type ConfigureGitHubSso_DisableGitHubSsoOnTeamMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
}>;


export type ConfigureGitHubSso_DisableGitHubSsoOnTeamMutation = { __typename?: 'Mutation', disableGitHubSSOOnTeam: (
    { __typename?: 'Team' }
    & { ' $fragmentRefs'?: { 'TeamGitHubSso_TeamFragment': TeamGitHubSso_TeamFragment } }
  ) };

export type ConfigureGitHubSso_InstallationsQueryVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
}>;


export type ConfigureGitHubSso_InstallationsQuery = { __typename?: 'Query', teamAccount?: { __typename?: 'Team', id: string, githubLightInstallation?: { __typename?: 'GithubInstallation', id: string, ghInstallation?: (
        { __typename?: 'GhApiInstallation', id: string }
        & { ' $fragmentRefs'?: { 'GithubInstallationsSelect_GhApiInstallationFragment': GithubInstallationsSelect_GhApiInstallationFragment } }
      ) | null } | null } | { __typename?: 'User', id: string } | null, me?: { __typename?: 'User', id: string, ghInstallations: { __typename?: 'GhApiInstallationConnection', edges: Array<(
        { __typename?: 'GhApiInstallation', id: string, account: { __typename?: 'GhApiInstallationAccount', id: string, login: string } }
        & { ' $fragmentRefs'?: { 'GithubInstallationsSelect_GhApiInstallationFragment': GithubInstallationsSelect_GhApiInstallationFragment } }
      )>, pageInfo: { __typename?: 'PageInfo', totalCount: number } } } | null };

export type ConfigureGitHubSso_EnableGitHubSsoOnTeamMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  ghInstallationId: Scalars['Int']['input'];
}>;


export type ConfigureGitHubSso_EnableGitHubSsoOnTeamMutation = { __typename?: 'Mutation', enableGitHubSSOOnTeam: (
    { __typename?: 'Team' }
    & { ' $fragmentRefs'?: { 'TeamGitHubSso_TeamFragment': TeamGitHubSso_TeamFragment } }
  ) };

export type TeamMembers_TeamMembersQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  first: Scalars['Int']['input'];
  after: Scalars['Int']['input'];
}>;


export type TeamMembers_TeamMembersQuery = { __typename?: 'Query', team?: { __typename?: 'Team', id: string, members: { __typename?: 'TeamMemberConnection', edges: Array<(
        { __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: (
          { __typename?: 'User', id: string }
          & { ' $fragmentRefs'?: { 'UserListRow_UserFragment': UserListRow_UserFragment;'RemoveFromTeamDialog_UserFragment': RemoveFromTeamDialog_UserFragment } }
        ) }
        & { ' $fragmentRefs'?: { 'LevelSelect_TeamMemberFragment': LevelSelect_TeamMemberFragment } }
      )>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, totalCount: number } } } | null };

export type TeamMembers_GithubMembersQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  first: Scalars['Int']['input'];
  after: Scalars['Int']['input'];
}>;


export type TeamMembers_GithubMembersQuery = { __typename?: 'Query', team?: { __typename?: 'Team', id: string, githubMembers?: { __typename?: 'TeamGithubMemberConnection', edges: Array<{ __typename?: 'TeamGithubMember', id: string, githubAccount: { __typename?: 'GithubAccount', id: string, login: string, avatar: (
            { __typename?: 'AccountAvatar' }
            & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
          ) }, teamMember?: (
          { __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: (
            { __typename?: 'User', id: string, name?: string | null, slug: string, avatar: (
              { __typename?: 'AccountAvatar' }
              & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
            ) }
            & { ' $fragmentRefs'?: { 'RemoveFromTeamDialog_UserFragment': RemoveFromTeamDialog_UserFragment } }
          ) }
          & { ' $fragmentRefs'?: { 'LevelSelect_TeamMemberFragment': LevelSelect_TeamMemberFragment } }
        ) | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean } } | null } | null };

export type TeamMembers_TeamFragment = { __typename?: 'Team', id: string, name?: string | null, slug: string, inviteLink?: string | null, permissions: Array<AccountPermission>, ssoGithubAccount?: (
    { __typename?: 'GithubAccount', id: string }
    & { ' $fragmentRefs'?: { 'TeamGithubMembersList_GithubAccountFragment': TeamGithubMembersList_GithubAccountFragment } }
  ) | null, plan?: { __typename?: 'Plan', id: string, fineGrainedAccessControlIncluded: boolean } | null, me?: { __typename?: 'TeamMember', id: string, level: TeamUserLevel } | null } & { ' $fragmentName'?: 'TeamMembers_TeamFragment' };

export type TeamMembers_LeaveTeamMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
}>;


export type TeamMembers_LeaveTeamMutation = { __typename?: 'Mutation', leaveTeam: boolean };

export type TeamMembers_RemoveUserFromTeamMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
}>;


export type TeamMembers_RemoveUserFromTeamMutation = { __typename?: 'Mutation', removeUserFromTeam: { __typename?: 'RemoveUserFromTeamPayload', teamMemberId: string } };

export type RemoveFromTeamDialog_UserFragment = (
  { __typename?: 'User', id: string }
  & { ' $fragmentRefs'?: { 'UserListRow_UserFragment': UserListRow_UserFragment } }
) & { ' $fragmentName'?: 'RemoveFromTeamDialog_UserFragment' };

export type SetTeamMemberLevelMutationMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
  level: TeamUserLevel;
}>;


export type SetTeamMemberLevelMutationMutation = { __typename?: 'Mutation', setTeamMemberLevel: { __typename?: 'TeamMember', id: string, level: TeamUserLevel } };

export type LevelSelect_TeamMemberFragment = { __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: { __typename?: 'User', id: string } } & { ' $fragmentName'?: 'LevelSelect_TeamMemberFragment' };

export type TeamGithubMembersList_GithubAccountFragment = (
  { __typename?: 'GithubAccount', id: string }
  & { ' $fragmentRefs'?: { 'GithubAccountLink_GithubAccountFragment': GithubAccountLink_GithubAccountFragment } }
) & { ' $fragmentName'?: 'TeamGithubMembersList_GithubAccountFragment' };

export type NewTeam_CreateTeamMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type NewTeam_CreateTeamMutation = { __typename?: 'Mutation', createTeam: { __typename?: 'CreateTeamResult', redirectUrl: string } };

export type TeamNewForm_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type TeamNewForm_MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, stripeCustomerId?: string | null, hasSubscribedToTrial: boolean } | null };

type TeamSlack_Account_Team_Fragment = { __typename?: 'Team', id: string, slackInstallation?: { __typename?: 'SlackInstallation', id: string, createdAt: any, teamName: string, teamDomain: string } | null } & { ' $fragmentName'?: 'TeamSlack_Account_Team_Fragment' };

type TeamSlack_Account_User_Fragment = { __typename?: 'User', id: string, slackInstallation?: { __typename?: 'SlackInstallation', id: string, createdAt: any, teamName: string, teamDomain: string } | null } & { ' $fragmentName'?: 'TeamSlack_Account_User_Fragment' };

export type TeamSlack_AccountFragment = TeamSlack_Account_Team_Fragment | TeamSlack_Account_User_Fragment;

export type AccountSlack_UninstallSlackMutationVariables = Exact<{
  accountId: Scalars['ID']['input'];
}>;


export type AccountSlack_UninstallSlackMutation = { __typename?: 'Mutation', uninstallSlack: (
    { __typename?: 'Team', id: string }
    & { ' $fragmentRefs'?: { 'TeamSlack_Account_Team_Fragment': TeamSlack_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string }
    & { ' $fragmentRefs'?: { 'TeamSlack_Account_User_Fragment': TeamSlack_Account_User_Fragment } }
  ) };

export type UpgradeDialog_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type UpgradeDialog_MeQuery = { __typename?: 'Query', me?: (
    { __typename?: 'User', id: string, slug: string, hasSubscribedToTrial: boolean, teams: Array<(
      { __typename?: 'Team', id: string, slug: string, subscriptionStatus?: AccountSubscriptionStatus | null }
      & { ' $fragmentRefs'?: { 'AccountItem_Account_Team_Fragment': AccountItem_Account_Team_Fragment } }
    )> }
    & { ' $fragmentRefs'?: { 'AccountItem_Account_User_Fragment': AccountItem_Account_User_Fragment } }
  ) | null };

type UserAuth_Account_Team_Fragment = { __typename?: 'Team', id: string } & { ' $fragmentName'?: 'UserAuth_Account_Team_Fragment' };

type UserAuth_Account_User_Fragment = (
  { __typename?: 'User', id: string }
  & { ' $fragmentRefs'?: { 'GitHubAuth_Account_User_Fragment': GitHubAuth_Account_User_Fragment;'GitLabAuth_AccountFragment': GitLabAuth_AccountFragment;'GoogleAuth_AccountFragment': GoogleAuth_AccountFragment } }
) & { ' $fragmentName'?: 'UserAuth_Account_User_Fragment' };

export type UserAuth_AccountFragment = UserAuth_Account_Team_Fragment | UserAuth_Account_User_Fragment;

type GitHubAuth_Account_Team_Fragment = { __typename?: 'Team', id: string, githubAccount?: { __typename?: 'GithubAccount', id: string, login: string, name?: string | null, url: string, lastLoggedAt?: any | null } | null } & { ' $fragmentName'?: 'GitHubAuth_Account_Team_Fragment' };

type GitHubAuth_Account_User_Fragment = { __typename?: 'User', id: string, githubAccount?: { __typename?: 'GithubAccount', id: string, login: string, name?: string | null, url: string, lastLoggedAt?: any | null } | null } & { ' $fragmentName'?: 'GitHubAuth_Account_User_Fragment' };

export type GitHubAuth_AccountFragment = GitHubAuth_Account_Team_Fragment | GitHubAuth_Account_User_Fragment;

export type GitHubAuth_DisconnectGitHubAuthMutationVariables = Exact<{
  accountId: Scalars['ID']['input'];
}>;


export type GitHubAuth_DisconnectGitHubAuthMutation = { __typename?: 'Mutation', disconnectGitHubAuth: (
    { __typename?: 'Team' }
    & { ' $fragmentRefs'?: { 'GitHubAuth_Account_Team_Fragment': GitHubAuth_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User' }
    & { ' $fragmentRefs'?: { 'GitHubAuth_Account_User_Fragment': GitHubAuth_Account_User_Fragment } }
  ) };

export type GitLabAuth_AccountFragment = { __typename?: 'User', id: string, gitlabUser?: { __typename?: 'GitlabUser', id: string, username: string, name: string, url: string, lastLoggedAt?: any | null } | null } & { ' $fragmentName'?: 'GitLabAuth_AccountFragment' };

export type GitLabAuth_DisconnectGitLabAuthMutationVariables = Exact<{
  accountId: Scalars['ID']['input'];
}>;


export type GitLabAuth_DisconnectGitLabAuthMutation = { __typename?: 'Mutation', disconnectGitLabAuth: { __typename?: 'Team' } | (
    { __typename?: 'User' }
    & { ' $fragmentRefs'?: { 'GitLabAuth_AccountFragment': GitLabAuth_AccountFragment } }
  ) };

export type GoogleAuth_AccountFragment = { __typename?: 'User', id: string, googleUser?: { __typename?: 'GoogleUser', id: string, name?: string | null, primaryEmail?: string | null, lastLoggedAt?: any | null } | null } & { ' $fragmentName'?: 'GoogleAuth_AccountFragment' };

export type GoogleAuth_DisconnectGoogleAuthMutationVariables = Exact<{
  accountId: Scalars['ID']['input'];
}>;


export type GoogleAuth_DisconnectGoogleAuthMutation = { __typename?: 'Mutation', disconnectGoogleAuth: { __typename?: 'Team' } | (
    { __typename?: 'User' }
    & { ' $fragmentRefs'?: { 'GoogleAuth_AccountFragment': GoogleAuth_AccountFragment } }
  ) };

export type UserListRow_UserFragment = { __typename?: 'User', id: string, slug: string, name?: string | null, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) } & { ' $fragmentName'?: 'UserListRow_UserFragment' };

export type AccountUsage_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
  from: Scalars['DateTime']['input'];
  groupBy: TimeSeriesGroupBy;
}>;


export type AccountUsage_AccountQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, permissions: Array<AccountPermission>, metrics: { __typename?: 'AccountMetrics', screenshots: { __typename?: 'AccountScreenshotMetrics', all: { __typename?: 'AccountMetricData', total: number, projects: any }, series: Array<{ __typename?: 'AccountMetricDataPoint', ts: any, total: number, projects: any }>, projects: Array<{ __typename?: 'Project', id: string, name: string }> }, builds: { __typename?: 'AccountBuildsMetrics', all: { __typename?: 'AccountMetricData', total: number, projects: any }, series: Array<{ __typename?: 'AccountMetricDataPoint', ts: any, total: number, projects: any }>, projects: Array<{ __typename?: 'Project', id: string, name: string }> } } } | { __typename?: 'User', id: string, permissions: Array<AccountPermission>, metrics: { __typename?: 'AccountMetrics', screenshots: { __typename?: 'AccountScreenshotMetrics', all: { __typename?: 'AccountMetricData', total: number, projects: any }, series: Array<{ __typename?: 'AccountMetricDataPoint', ts: any, total: number, projects: any }>, projects: Array<{ __typename?: 'Project', id: string, name: string }> }, builds: { __typename?: 'AccountBuildsMetrics', all: { __typename?: 'AccountMetricData', total: number, projects: any }, series: Array<{ __typename?: 'AccountMetricDataPoint', ts: any, total: number, projects: any }>, projects: Array<{ __typename?: 'Project', id: string, name: string }> } } } | null };

export type NewProject_ImportGithubProjectMutationVariables = Exact<{
  repo: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  accountSlug: Scalars['String']['input'];
  app: GitHubAppType;
}>;


export type NewProject_ImportGithubProjectMutation = { __typename?: 'Mutation', importGithubProject: { __typename?: 'Project', id: string, slug: string } };

export type NewProject_ImportGitlabProjectMutationVariables = Exact<{
  gitlabProjectId: Scalars['ID']['input'];
  accountSlug: Scalars['String']['input'];
}>;


export type NewProject_ImportGitlabProjectMutation = { __typename?: 'Mutation', importGitlabProject: { __typename?: 'Project', id: string, slug: string } };

export type AccountProjects_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type AccountProjects_AccountQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, permissions: Array<AccountPermission>, projects: { __typename?: 'ProjectConnection', edges: Array<(
        { __typename?: 'Project', id: string }
        & { ' $fragmentRefs'?: { 'ProjectList_ProjectFragment': ProjectList_ProjectFragment } }
      )> } } | { __typename?: 'User', id: string, permissions: Array<AccountPermission>, projects: { __typename?: 'ProjectConnection', edges: Array<(
        { __typename?: 'Project', id: string }
        & { ' $fragmentRefs'?: { 'ProjectList_ProjectFragment': ProjectList_ProjectFragment } }
      )> } } | null };

export type AccountSettings_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type AccountSettings_AccountQuery = { __typename?: 'Query', account?: (
    { __typename?: 'Team', id: string, plan?: { __typename?: 'Plan', id: string, fineGrainedAccessControlIncluded: boolean } | null }
    & { ' $fragmentRefs'?: { 'TeamSlack_Account_Team_Fragment': TeamSlack_Account_Team_Fragment;'TeamMembers_TeamFragment': TeamMembers_TeamFragment;'TeamDelete_TeamFragment': TeamDelete_TeamFragment;'AccountChangeName_Account_Team_Fragment': AccountChangeName_Account_Team_Fragment;'AccountChangeSlug_Account_Team_Fragment': AccountChangeSlug_Account_Team_Fragment;'PlanCard_Account_Team_Fragment': PlanCard_Account_Team_Fragment;'AccountGitLab_Account_Team_Fragment': AccountGitLab_Account_Team_Fragment;'TeamGitHubSso_TeamFragment': TeamGitHubSso_TeamFragment;'TeamAccessRole_TeamFragment': TeamAccessRole_TeamFragment;'TeamGitHubLight_TeamFragment': TeamGitHubLight_TeamFragment;'UserAuth_Account_Team_Fragment': UserAuth_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string }
    & { ' $fragmentRefs'?: { 'TeamSlack_Account_User_Fragment': TeamSlack_Account_User_Fragment;'AccountChangeName_Account_User_Fragment': AccountChangeName_Account_User_Fragment;'AccountChangeSlug_Account_User_Fragment': AccountChangeSlug_Account_User_Fragment;'PlanCard_Account_User_Fragment': PlanCard_Account_User_Fragment;'AccountGitLab_Account_User_Fragment': AccountGitLab_Account_User_Fragment;'UserAuth_Account_User_Fragment': UserAuth_Account_User_Fragment } }
  ) | null };

export type Account_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type Account_AccountQuery = { __typename?: 'Query', account?: (
    { __typename?: 'Team', id: string, slug: string, permissions: Array<AccountPermission> }
    & { ' $fragmentRefs'?: { 'PaymentBanner_Account_Team_Fragment': PaymentBanner_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, slug: string, permissions: Array<AccountPermission> }
    & { ' $fragmentRefs'?: { 'PaymentBanner_Account_User_Fragment': PaymentBanner_Account_User_Fragment } }
  ) | null };

export type BuildDetail_BuildFragment = { __typename?: 'Build', id: string, createdAt: any, branch?: string | null, type?: BuildType | null, stats?: { __typename?: 'BuildStats', total: number } | null, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', id: string, branch?: string | null, createdAt: any } | null, pullRequest?: { __typename?: 'GithubPullRequest', merged?: boolean | null } | null } & { ' $fragmentName'?: 'BuildDetail_BuildFragment' };

export type BuildDiffState_ScreenshotDiffFragment = { __typename?: 'ScreenshotDiff', id: string, status: ScreenshotDiffStatus, url?: string | null, name: string, width?: number | null, height?: number | null, group?: string | null, threshold?: number | null, baseScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null, metadata?: { __typename?: 'ScreenshotMetadata', url?: string | null, colorScheme?: ScreenshotMetadataColorScheme | null, mediaType?: ScreenshotMetadataMediaType | null, automationLibrary: { __typename?: 'ScreenshotMetadataAutomationLibrary', name: string, version: string }, browser?: { __typename?: 'ScreenshotMetadataBrowser', name: string, version: string } | null, sdk: { __typename?: 'ScreenshotMetadataSDK', name: string, version: string }, viewport?: { __typename?: 'ScreenshotMetadataViewport', width: number, height: number } | null, test?: { __typename?: 'ScreenshotMetadataTest', id?: string | null, title: string, titlePath: Array<string>, retry?: number | null, retries?: number | null, repeat?: number | null, location?: { __typename?: 'ScreenshotMetadataLocation', file: string, line: number } | null } | null } | null } | null, compareScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null, playwrightTraceUrl?: string | null, metadata?: { __typename?: 'ScreenshotMetadata', url?: string | null, colorScheme?: ScreenshotMetadataColorScheme | null, mediaType?: ScreenshotMetadataMediaType | null, automationLibrary: { __typename?: 'ScreenshotMetadataAutomationLibrary', name: string, version: string }, browser?: { __typename?: 'ScreenshotMetadataBrowser', name: string, version: string } | null, sdk: { __typename?: 'ScreenshotMetadataSDK', name: string, version: string }, viewport?: { __typename?: 'ScreenshotMetadataViewport', width: number, height: number } | null, test?: { __typename?: 'ScreenshotMetadataTest', id?: string | null, title: string, titlePath: Array<string>, retry?: number | null, retries?: number | null, repeat?: number | null, location?: { __typename?: 'ScreenshotMetadataLocation', file: string, line: number } | null } | null } | null } | null } & { ' $fragmentName'?: 'BuildDiffState_ScreenshotDiffFragment' };

export type BuildDiffState_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
  buildNumber: Scalars['Int']['input'];
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
}>;


export type BuildDiffState_ProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, build?: { __typename?: 'Build', id: string, screenshotDiffs: { __typename?: 'ScreenshotDiffConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, edges: Array<(
          { __typename?: 'ScreenshotDiff' }
          & { ' $fragmentRefs'?: { 'BuildDiffState_ScreenshotDiffFragment': BuildDiffState_ScreenshotDiffFragment } }
        )> } } | null } | null };

export type BuildDiffState_BuildFragment = { __typename?: 'Build', id: string, stats?: (
    { __typename?: 'BuildStats', total: number, failure: number, changed: number, added: number, removed: number, unchanged: number, retryFailure: number }
    & { ' $fragmentRefs'?: { 'BuildStatsIndicator_BuildStatsFragment': BuildStatsIndicator_BuildStatsFragment } }
  ) | null } & { ' $fragmentName'?: 'BuildDiffState_BuildFragment' };

export type BuildInfos_BuildFragment = { __typename?: 'Build', createdAt: any, name: string, commit: string, branch?: string | null, mode: BuildMode, baseBranch?: string | null, baseBranchResolvedFrom?: BaseBranchResolution | null, stats?: { __typename?: 'BuildStats', total: number } | null, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', id: string, commit: string, branch?: string | null } | null, baseBuild?: { __typename?: 'Build', id: string, number: number } | null, pullRequest?: { __typename?: 'GithubPullRequest', id: string, url: string, number: number } | null, metadata?: { __typename?: 'BuildMetadata', testReport?: { __typename?: 'TestReport', status: TestReportStatus } | null } | null } & { ' $fragmentName'?: 'BuildInfos_BuildFragment' };

export type BuildOrphanDialog_BuildFragment = { __typename?: 'Build', baseBranch?: string | null, mode: BuildMode, type?: BuildType | null } & { ' $fragmentName'?: 'BuildOrphanDialog_BuildFragment' };

export type BuildOrphanDialog_ProjectFragment = { __typename?: 'Project', slug: string } & { ' $fragmentName'?: 'BuildOrphanDialog_ProjectFragment' };

export type BuildPage_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
  buildNumber: Scalars['Int']['input'];
}>;


export type BuildPage_ProjectQuery = { __typename?: 'Query', project?: (
    { __typename?: 'Project', id: string, permissions: Array<ProjectPermission>, account: (
      { __typename?: 'Team', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Account_Team_Fragment': OvercapacityBanner_Account_Team_Fragment;'PaymentBanner_Account_Team_Fragment': PaymentBanner_Account_Team_Fragment } }
    ) | (
      { __typename?: 'User', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Account_User_Fragment': OvercapacityBanner_Account_User_Fragment;'PaymentBanner_Account_User_Fragment': PaymentBanner_Account_User_Fragment } }
    ), build?: (
      { __typename?: 'Build', id: string, status: BuildStatus }
      & { ' $fragmentRefs'?: { 'BuildHeader_BuildFragment': BuildHeader_BuildFragment;'BuildWorkspace_BuildFragment': BuildWorkspace_BuildFragment;'BuildDiffState_BuildFragment': BuildDiffState_BuildFragment } }
    ) | null }
    & { ' $fragmentRefs'?: { 'BuildHeader_ProjectFragment': BuildHeader_ProjectFragment;'BuildWorkspace_ProjectFragment': BuildWorkspace_ProjectFragment;'BuildReviewDialog_ProjectFragment': BuildReviewDialog_ProjectFragment } }
  ) | null };

export type BuildReviewAction_SetValidationStatusMutationVariables = Exact<{
  buildId: Scalars['ID']['input'];
  validationStatus: ValidationStatus;
}>;


export type BuildReviewAction_SetValidationStatusMutation = { __typename?: 'Mutation', setValidationStatus: { __typename?: 'Build', id: string, status: BuildStatus } };

export type BuildReviewButton_ProjectFragment = { __typename?: 'Project', name: string, permissions: Array<ProjectPermission>, public: boolean, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string }, build?: { __typename?: 'Build', id: string, status: BuildStatus } | null } & { ' $fragmentName'?: 'BuildReviewButton_ProjectFragment' };

export type BuildReviewDialog_ProjectFragment = (
  { __typename?: 'Project', build?: { __typename?: 'Build', id: string } | null }
  & { ' $fragmentRefs'?: { 'BuildReviewButton_ProjectFragment': BuildReviewButton_ProjectFragment } }
) & { ' $fragmentName'?: 'BuildReviewDialog_ProjectFragment' };

export type BuildSidebar_BuildFragment = (
  { __typename?: 'Build', stats?: { __typename?: 'BuildStats', total: number } | null }
  & { ' $fragmentRefs'?: { 'BuildInfos_BuildFragment': BuildInfos_BuildFragment } }
) & { ' $fragmentName'?: 'BuildSidebar_BuildFragment' };

export type BuildStatsIndicator_BuildStatsFragment = { __typename?: 'BuildStats', total: number, failure: number, changed: number, added: number, removed: number, unchanged: number, retryFailure: number } & { ' $fragmentName'?: 'BuildStatsIndicator_BuildStatsFragment' };

export type BuildWorkspace_BuildFragment = (
  { __typename?: 'Build', status: BuildStatus, parallel?: { __typename?: 'BuildParallel', total: number, received: number, nonce: string } | null }
  & { ' $fragmentRefs'?: { 'BuildSidebar_BuildFragment': BuildSidebar_BuildFragment;'BuildStatusDescription_BuildFragment': BuildStatusDescription_BuildFragment;'BuildDetail_BuildFragment': BuildDetail_BuildFragment;'BuildOrphanDialog_BuildFragment': BuildOrphanDialog_BuildFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_BuildFragment' };

export type BuildWorkspace_ProjectFragment = (
  { __typename?: 'Project', repository?: { __typename?: 'GithubRepository', id: string, url: string } | { __typename?: 'GitlabProject', id: string, url: string } | null }
  & { ' $fragmentRefs'?: { 'BuildOrphanDialog_ProjectFragment': BuildOrphanDialog_ProjectFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_ProjectFragment' };

type OvercapacityBanner_Account_Team_Fragment = { __typename?: 'Team', consumptionRatio: number, plan?: { __typename?: 'Plan', id: string, displayName: string, usageBased: boolean } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Account_Team_Fragment' };

type OvercapacityBanner_Account_User_Fragment = { __typename?: 'User', consumptionRatio: number, plan?: { __typename?: 'Plan', id: string, displayName: string, usageBased: boolean } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Account_User_Fragment' };

export type OvercapacityBanner_AccountFragment = OvercapacityBanner_Account_Team_Fragment | OvercapacityBanner_Account_User_Fragment;

export type BuildHeader_BuildFragment = (
  { __typename?: 'Build', name: string, status: BuildStatus, type?: BuildType | null, mode: BuildMode, pullRequest?: (
    { __typename?: 'GithubPullRequest', id: string }
    & { ' $fragmentRefs'?: { 'PullRequestButton_PullRequestFragment': PullRequestButton_PullRequestFragment } }
  ) | null }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
) & { ' $fragmentName'?: 'BuildHeader_BuildFragment' };

export type BuildHeader_ProjectFragment = (
  { __typename?: 'Project' }
  & { ' $fragmentRefs'?: { 'BuildReviewButton_ProjectFragment': BuildReviewButton_ProjectFragment } }
) & { ' $fragmentName'?: 'BuildHeader_ProjectFragment' };

export type Invite_InvitationQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type Invite_InvitationQuery = { __typename?: 'Query', invitation?: { __typename?: 'Team', id: string, name?: string | null, slug: string, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) } | null, me?: { __typename?: 'User', id: string, teams: Array<{ __typename?: 'Team', id: string }> } | null };

export type Invite_AcceptInvitationMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type Invite_AcceptInvitationMutation = { __typename?: 'Mutation', acceptInvitation: { __typename?: 'Team', id: string, slug: string } };

export type ProjectBuilds_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
}>;


export type ProjectBuilds_ProjectQuery = { __typename?: 'Query', project?: (
    { __typename?: 'Project', id: string, buildNames: Array<string>, repository?: { __typename: 'GithubRepository', id: string, url: string } | { __typename: 'GitlabProject', id: string, url: string } | null }
    & { ' $fragmentRefs'?: { 'GettingStarted_ProjectFragment': GettingStarted_ProjectFragment } }
  ) | null };

export type ProjectBuilds_Project_BuildsQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
  buildName?: InputMaybe<Scalars['String']['input']>;
}>;


export type ProjectBuilds_Project_BuildsQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, builds: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number, hasNextPage: boolean }, edges: Array<(
        { __typename?: 'Build', id: string, number: number, createdAt: any, name: string, branch?: string | null, commit: string, mode: BuildMode, stats?: (
          { __typename?: 'BuildStats' }
          & { ' $fragmentRefs'?: { 'BuildStatsIndicator_BuildStatsFragment': BuildStatsIndicator_BuildStatsFragment } }
        ) | null, pullRequest?: (
          { __typename?: 'GithubPullRequest', id: string }
          & { ' $fragmentRefs'?: { 'PullRequestButton_PullRequestFragment': PullRequestButton_PullRequestFragment } }
        ) | null }
        & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
      )> } } | null };

export type GettingStarted_ProjectFragment = { __typename?: 'Project', token?: string | null } & { ' $fragmentName'?: 'GettingStarted_ProjectFragment' };

export type ProjectLatestAutoApproved_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
}>;


export type ProjectLatestAutoApproved_ProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, latestAutoApprovedBuild?: { __typename?: 'Build', id: string, number: number } | null } | null };

export type ProjectSettings_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
}>;


export type ProjectSettings_ProjectQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, plan?: { __typename?: 'Plan', id: string, fineGrainedAccessControlIncluded: boolean } | null } | { __typename?: 'User', id: string } | null, project?: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectBadge_ProjectFragment': ProjectBadge_ProjectFragment;'ProjectChangeName_ProjectFragment': ProjectChangeName_ProjectFragment;'ProjectToken_ProjectFragment': ProjectToken_ProjectFragment;'ProjectBranches_ProjectFragment': ProjectBranches_ProjectFragment;'ProjectStatusChecks_ProjectFragment': ProjectStatusChecks_ProjectFragment;'ProjectVisibility_ProjectFragment': ProjectVisibility_ProjectFragment;'ProjectTransfer_ProjectFragment': ProjectTransfer_ProjectFragment;'ProjectDelete_ProjectFragment': ProjectDelete_ProjectFragment;'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment;'ProjectContributors_ProjectFragment': ProjectContributors_ProjectFragment } }
  ) | null };

export type Project_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
}>;


export type Project_ProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, permissions: Array<ProjectPermission>, name: string, account: (
      { __typename?: 'Team', id: string }
      & { ' $fragmentRefs'?: { 'PaymentBanner_Account_Team_Fragment': PaymentBanner_Account_Team_Fragment } }
    ) | (
      { __typename?: 'User', id: string }
      & { ' $fragmentRefs'?: { 'PaymentBanner_Account_User_Fragment': PaymentBanner_Account_User_Fragment } }
    ) } | null };

export const AccountChangeName_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeName_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<AccountChangeName_AccountFragment, unknown>;
export const AccountChangeSlug_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeSlug_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<AccountChangeSlug_AccountFragment, unknown>;
export const AccountGitLab_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountGitLab_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabBaseUrl"}}]}}]} as unknown as DocumentNode<AccountGitLab_AccountFragment, unknown>;
export const AccountAvatarFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<AccountAvatarFragmentFragment, unknown>;
export const AccountPlanChip_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]} as unknown as DocumentNode<AccountPlanChip_AccountFragment, unknown>;
export const AccountItem_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]} as unknown as DocumentNode<AccountItem_AccountFragment, unknown>;
export const AccountBreadcrumbMenu_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<AccountBreadcrumbMenu_AccountFragment, unknown>;
export const GithubInstallationsSelect_GhApiInstallationFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GhApiInstallation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<GithubInstallationsSelect_GhApiInstallationFragment, unknown>;
export const GitlabNamespacesSelect_GlApiNamespaceFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitlabNamespacesSelect_GlApiNamespace"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GlApiNamespace"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}}]}}]} as unknown as DocumentNode<GitlabNamespacesSelect_GlApiNamespaceFragment, unknown>;
export const PaymentBanner_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}}]}}]}}]} as unknown as DocumentNode<PaymentBanner_AccountFragment, unknown>;
export const PlanCard_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanCard_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndDate"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"hasForcedPlan"}},{"kind":"Field","name":{"kind":"Name","value":"includedScreenshots"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"currentPeriodScreenshots"}}]}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]} as unknown as DocumentNode<PlanCard_AccountFragment, unknown>;
export const ProjectBadge_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectBadge_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProjectBadge_ProjectFragment, unknown>;
export const ProjectBranches_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectBranches_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"customDefaultBaseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"customAutoApprovedBranchGlob"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}}]} as unknown as DocumentNode<ProjectBranches_ProjectFragment, unknown>;
export const ProjectChangeName_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectChangeName_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectChangeName_ProjectFragment, unknown>;
export const ProjectDefaultUserLevel_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDefaultUserLevel_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}}]}}]} as unknown as DocumentNode<ProjectDefaultUserLevel_ProjectFragment, unknown>;
export const ProjectContributors_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectContributors_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectDefaultUserLevel_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDefaultUserLevel_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}}]}}]} as unknown as DocumentNode<ProjectContributors_ProjectFragment, unknown>;
export const UserListRow_UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<UserListRow_UserFragment, unknown>;
export const ContributorListRow_UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributorListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectsContributedOn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"1"}},{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<ContributorListRow_UserFragment, unknown>;
export const RemoveFromProjectDialog_UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromProjectDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<RemoveFromProjectDialog_UserFragment, unknown>;
export const ProjectContributedOnFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectContributedOnFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectsContributedOn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"1"}},{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectContributedOnFragmentFragment, unknown>;
export const ProjectDelete_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDelete_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectDelete_ProjectFragment, unknown>;
export const ProjectGitRepository_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_ProjectFragment, unknown>;
export const ProjectStatusChecks_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectStatusChecks_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"summaryCheck"}}]}}]} as unknown as DocumentNode<ProjectStatusChecks_ProjectFragment, unknown>;
export const ProjectToken_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectToken_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectToken_ProjectFragment, unknown>;
export const ProjectTransfer_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ProjectTransfer_AccountFragment, unknown>;
export const ProjectTransfer_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_ProjectFragment, unknown>;
export const ProjectVisibility_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVisibility_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}}]} as unknown as DocumentNode<ProjectVisibility_ProjectFragment, unknown>;
export const ProjectList_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectList_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"latestBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ProjectList_ProjectFragment, unknown>;
export const TeamAccessRole_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamAccessRole_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}}]}}]} as unknown as DocumentNode<TeamAccessRole_TeamFragment, unknown>;
export const TeamDelete_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamDelete_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}}]}}]}}]} as unknown as DocumentNode<TeamDelete_TeamFragment, unknown>;
export const TeamGitHubLight_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGitHubLight_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubLightInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]} as unknown as DocumentNode<TeamGitHubLight_TeamFragment, unknown>;
export const GithubAccountLink_GithubAccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<GithubAccountLink_GithubAccountFragment, unknown>;
export const TeamGitHubSso_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGitHubSSO_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"usageBased"}},{"kind":"Field","name":{"kind":"Name","value":"githubSsoIncluded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"ssoGithubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<TeamGitHubSso_TeamFragment, unknown>;
export const TeamGithubMembersList_GithubAccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGithubMembersList_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]} as unknown as DocumentNode<TeamGithubMembersList_GithubAccountFragment, unknown>;
export const TeamMembers_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamMembers_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"inviteLink"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"ssoGithubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamGithubMembersList_GithubAccount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fineGrainedAccessControlIncluded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGithubMembersList_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"}}]}}]} as unknown as DocumentNode<TeamMembers_TeamFragment, unknown>;
export const RemoveFromTeamDialog_UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<RemoveFromTeamDialog_UserFragment, unknown>;
export const LevelSelect_TeamMemberFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<LevelSelect_TeamMemberFragment, unknown>;
export const TeamSlack_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamSlack_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slackInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"teamName"}},{"kind":"Field","name":{"kind":"Name","value":"teamDomain"}}]}}]}}]} as unknown as DocumentNode<TeamSlack_AccountFragment, unknown>;
export const GitHubAuth_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitHubAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}}]} as unknown as DocumentNode<GitHubAuth_AccountFragment, unknown>;
export const GitLabAuth_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitLabAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}}]} as unknown as DocumentNode<GitLabAuth_AccountFragment, unknown>;
export const GoogleAuth_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GoogleAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"googleUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"primaryEmail"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}}]} as unknown as DocumentNode<GoogleAuth_AccountFragment, unknown>;
export const UserAuth_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitHubAuth_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitLabAuth_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GoogleAuth_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitHubAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitLabAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GoogleAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"googleUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"primaryEmail"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}}]} as unknown as DocumentNode<UserAuth_AccountFragment, unknown>;
export const BuildDiffState_ScreenshotDiffFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDiffState_ScreenshotDiff"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ScreenshotDiff"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}},{"kind":"Field","name":{"kind":"Name","value":"retry"}},{"kind":"Field","name":{"kind":"Name","value":"retries"}},{"kind":"Field","name":{"kind":"Name","value":"repeat"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}},{"kind":"Field","name":{"kind":"Name","value":"retry"}},{"kind":"Field","name":{"kind":"Name","value":"retries"}},{"kind":"Field","name":{"kind":"Name","value":"repeat"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"playwrightTraceUrl"}}]}}]}}]} as unknown as DocumentNode<BuildDiffState_ScreenshotDiffFragment, unknown>;
export const BuildStatsIndicator_BuildStatsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatsIndicator_BuildStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BuildStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}},{"kind":"Field","name":{"kind":"Name","value":"retryFailure"}}]}}]} as unknown as DocumentNode<BuildStatsIndicator_BuildStatsFragment, unknown>;
export const BuildDiffState_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDiffState_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatsIndicator_BuildStats"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}},{"kind":"Field","name":{"kind":"Name","value":"retryFailure"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatsIndicator_BuildStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BuildStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}},{"kind":"Field","name":{"kind":"Name","value":"retryFailure"}}]}}]} as unknown as DocumentNode<BuildDiffState_BuildFragment, unknown>;
export const BuildReviewButton_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<BuildReviewButton_ProjectFragment, unknown>;
export const BuildReviewDialog_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildReviewDialog_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildReviewButton_Project"}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<BuildReviewDialog_ProjectFragment, unknown>;
export const BuildInfos_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"testReport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranchResolvedFrom"}}]}}]} as unknown as DocumentNode<BuildInfos_BuildFragment, unknown>;
export const BuildSidebar_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"testReport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranchResolvedFrom"}}]}}]} as unknown as DocumentNode<BuildSidebar_BuildFragment, unknown>;
export const BuildStatusDescription_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}}]} as unknown as DocumentNode<BuildStatusDescription_BuildFragment, unknown>;
export const BuildDetail_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"merged"}}]}}]}}]} as unknown as DocumentNode<BuildDetail_BuildFragment, unknown>;
export const BuildOrphanDialog_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildOrphanDialog_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]} as unknown as DocumentNode<BuildOrphanDialog_BuildFragment, unknown>;
export const BuildWorkspace_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildOrphanDialog_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"testReport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranchResolvedFrom"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"merged"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildOrphanDialog_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]} as unknown as DocumentNode<BuildWorkspace_BuildFragment, unknown>;
export const BuildOrphanDialog_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildOrphanDialog_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<BuildOrphanDialog_ProjectFragment, unknown>;
export const BuildWorkspace_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildOrphanDialog_Project"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildOrphanDialog_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<BuildWorkspace_ProjectFragment, unknown>;
export const OvercapacityBanner_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"usageBased"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}}]} as unknown as DocumentNode<OvercapacityBanner_AccountFragment, unknown>;
export const PullRequestStatusIcon_PullRequestFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]} as unknown as DocumentNode<PullRequestStatusIcon_PullRequestFragment, unknown>;
export const PullRequestInfo_PullRequestFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]} as unknown as DocumentNode<PullRequestInfo_PullRequestFragment, unknown>;
export const PullRequestButton_PullRequestFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<PullRequestButton_PullRequestFragment, unknown>;
export const BuildStatusChip_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}}]} as unknown as DocumentNode<BuildStatusChip_BuildFragment, unknown>;
export const BuildHeader_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestButton_PullRequest"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<BuildHeader_BuildFragment, unknown>;
export const BuildHeader_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildReviewButton_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<BuildHeader_ProjectFragment, unknown>;
export const GettingStarted_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GettingStarted_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]} as unknown as DocumentNode<GettingStarted_ProjectFragment, unknown>;
export const AccountChangeName_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountChangeName_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountChangeName_UpdateAccountMutation, AccountChangeName_UpdateAccountMutationVariables>;
export const AccountChangeSlug_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountChangeSlug_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<AccountChangeSlug_UpdateAccountMutation, AccountChangeSlug_UpdateAccountMutationVariables>;
export const AccountGitLab_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountGitLab_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gitlabAccessToken"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"gitlabAccessToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gitlabAccessToken"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}}]}}]}}]} as unknown as DocumentNode<AccountGitLab_UpdateAccountMutation, AccountGitLab_UpdateAccountMutationVariables>;
export const AccountBreadcrumb_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountBreadcrumb_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]} as unknown as DocumentNode<AccountBreadcrumb_AccountQuery, AccountBreadcrumb_AccountQueryVariables>;
export const AccountBreadcrumbMenu_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountBreadcrumbMenu_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]} as unknown as DocumentNode<AccountBreadcrumbMenu_MeQuery, AccountBreadcrumbMenu_MeQueryVariables>;
export const ProjectBreadcrumbMenu_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBreadcrumbMenu_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ProjectBreadcrumbMenu_AccountQuery, ProjectBreadcrumbMenu_AccountQueryVariables>;
export const GithubRepositoryList_GhApiInstallationRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GithubRepositoryList_ghApiInstallationRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"installationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reposPerPage"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fromAuthUser"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ghApiInstallationRepositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"installationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"installationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"fromAuthUser"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fromAuthUser"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"reposPerPage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reposPerPage"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"owner_login"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]} as unknown as DocumentNode<GithubRepositoryList_GhApiInstallationRepositoriesQuery, GithubRepositoryList_GhApiInstallationRepositoriesQueryVariables>;
export const GitlabProjectList_GlApiProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GitlabProjectList_glApiProjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"allProjects"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"glApiProjects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"allProjects"},"value":{"kind":"Variable","name":{"kind":"Name","value":"allProjects"}}},{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"last_activity_at"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]} as unknown as DocumentNode<GitlabProjectList_GlApiProjectsQuery, GitlabProjectList_GlApiProjectsQueryVariables>;
export const NavUserControl_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"NavUserControl_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<NavUserControl_AccountQuery, NavUserControl_AccountQueryVariables>;
export const PaymentBanner_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PaymentBanner_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"hasSubscribedToTrial"}}]}}]}}]} as unknown as DocumentNode<PaymentBanner_MeQuery, PaymentBanner_MeQueryVariables>;
export const ProjectBranches_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectBranches_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"defaultBaseBranch"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"autoApprovedBranchGlob"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"defaultBaseBranch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"defaultBaseBranch"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"autoApprovedBranchGlob"},"value":{"kind":"Variable","name":{"kind":"Name","value":"autoApprovedBranchGlob"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"customDefaultBaseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"customAutoApprovedBranchGlob"}}]}}]}}]} as unknown as DocumentNode<ProjectBranches_UpdateProjectMutation, ProjectBranches_UpdateProjectMutationVariables>;
export const ProjectChangeName_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectChangeName_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProjectChangeName_UpdateProjectMutation, ProjectChangeName_UpdateProjectMutationVariables>;
export const ConnectRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ConnectRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}},{"kind":"Field","name":{"kind":"Name","value":"glNamespaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"isProjectToken"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitlabNamespacesSelect_GlApiNamespace"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubLightInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"ghInstallations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitlabNamespacesSelect_GlApiNamespace"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GlApiNamespace"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GhApiInstallation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ConnectRepositoryQuery, ConnectRepositoryQueryVariables>;
export const ProjectContributors_TeamContributorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectContributors_TeamContributors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"team"},"name":{"kind":"Name","value":"teamById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"levels"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"contributor"}]}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributorListRow_user"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributorListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectsContributedOn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"1"}},{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}}]} as unknown as DocumentNode<ProjectContributors_TeamContributorsQuery, ProjectContributors_TeamContributorsQueryVariables>;
export const ProjectAddOrUpdateContributorMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectAddOrUpdateContributorMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectUserLevel"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addOrUpdateProjectContributor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"userAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]} as unknown as DocumentNode<ProjectAddOrUpdateContributorMutationMutation, ProjectAddOrUpdateContributorMutationMutationVariables>;
export const ProjectContributorsQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectContributorsQuery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"project"},"name":{"kind":"Name","value":"projectById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<ProjectContributorsQueryQuery, ProjectContributorsQueryQueryVariables>;
export const ProjectDefaultUserLevel_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectDefaultUserLevel_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"defaultUserLevel"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectUserLevel"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"defaultUserLevel"},"value":{"kind":"Variable","name":{"kind":"Name","value":"defaultUserLevel"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}}]}}]}}]} as unknown as DocumentNode<ProjectDefaultUserLevel_UpdateProjectMutation, ProjectDefaultUserLevel_UpdateProjectMutationVariables>;
export const RemoveContributorFromProjectMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveContributorFromProjectMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeContributorFromProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"userAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectContributorId"}}]}}]}}]} as unknown as DocumentNode<RemoveContributorFromProjectMutationMutation, RemoveContributorFromProjectMutationMutationVariables>;
export const ProjectContributors_TeamMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectContributors_TeamMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"team"},"name":{"kind":"Name","value":"teamById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"levels"},"value":{"kind":"ListValue","values":[{"kind":"EnumValue","value":"owner"},{"kind":"EnumValue","value":"member"}]}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<ProjectContributors_TeamMembersQuery, ProjectContributors_TeamMembersQueryVariables>;
export const DeleteProjectMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProjectMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}]}}]} as unknown as DocumentNode<DeleteProjectMutationMutation, DeleteProjectMutationMutationVariables>;
export const ProjectGitRepository_LinkGithubRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_linkGithubRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"app"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GitHubAppType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkGithubRepository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"app"},"value":{"kind":"Variable","name":{"kind":"Name","value":"app"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_LinkGithubRepositoryMutation, ProjectGitRepository_LinkGithubRepositoryMutationVariables>;
export const ProjectGitRepository_UnlinkGithubRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_unlinkGithubRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkGithubRepository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_UnlinkGithubRepositoryMutation, ProjectGitRepository_UnlinkGithubRepositoryMutationVariables>;
export const ProjectGitRepository_LinkGitlabProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_linkGitlabProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkGitlabProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"gitlabProjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_LinkGitlabProjectMutation, ProjectGitRepository_LinkGitlabProjectMutationVariables>;
export const ProjectGitRepository_UnlinkGitlabProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_unlinkGitlabProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkGitlabProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_UnlinkGitlabProjectMutation, ProjectGitRepository_UnlinkGitlabProjectMutationVariables>;
export const ProjectGitRepository_UpdateEnablePrCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_updateEnablePrComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProjectPrComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"enabled"},"value":{"kind":"Variable","name":{"kind":"Name","value":"enabled"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]}}]} as unknown as DocumentNode<ProjectGitRepository_UpdateEnablePrCommentMutation, ProjectGitRepository_UpdateEnablePrCommentMutationVariables>;
export const ProjectStatusChecks_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectStatusChecks_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"summaryCheck"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SummaryCheck"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"summaryCheck"},"value":{"kind":"Variable","name":{"kind":"Name","value":"summaryCheck"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"summaryCheck"}}]}}]}}]} as unknown as DocumentNode<ProjectStatusChecks_UpdateProjectMutation, ProjectStatusChecks_UpdateProjectMutationVariables>;
export const RegenerateTokenMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RegenerateTokenMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"regenerateProjectToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]}}]} as unknown as DocumentNode<RegenerateTokenMutationMutation, RegenerateTokenMutationMutationVariables>;
export const TransferProject_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TransferProject_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<TransferProject_MeQuery, TransferProject_MeQueryVariables>;
export const ProjectTransfer_ReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectTransfer_Review"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actualAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalScreenshots"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"actualAccount"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actualAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Account"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"targetAccount"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Account"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_ReviewQuery, ProjectTransfer_ReviewQueryVariables>;
export const ProjectTransfer_TransferProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectTransfer_TransferProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transferProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"targetAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_TransferProjectMutation, ProjectTransfer_TransferProjectMutationVariables>;
export const ProjectVisibility_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectVisibility_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"private"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"private"},"value":{"kind":"Variable","name":{"kind":"Name","value":"private"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}}]} as unknown as DocumentNode<ProjectVisibility_UpdateProjectMutation, ProjectVisibility_UpdateProjectMutationVariables>;
export const TeamAccessUserLevel_SetTeamDefaultUserLevelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TeamAccessUserLevel_setTeamDefaultUserLevel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TeamDefaultUserLevel"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setTeamDefaultUserLevel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamAccessRole_Team"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamAccessRole_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}}]}}]} as unknown as DocumentNode<TeamAccessUserLevel_SetTeamDefaultUserLevelMutation, TeamAccessUserLevel_SetTeamDefaultUserLevelMutationVariables>;
export const DeleteTeamMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTeamMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}]}}]}]}}]} as unknown as DocumentNode<DeleteTeamMutationMutation, DeleteTeamMutationMutationVariables>;
export const ConfigureGitHubSso_DisableGitHubSsoOnTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfigureGitHubSSO_disableGitHubSSOOnTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disableGitHubSSOOnTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamGitHubSSO_Team"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGitHubSSO_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"usageBased"}},{"kind":"Field","name":{"kind":"Name","value":"githubSsoIncluded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"ssoGithubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"}}]}}]}}]} as unknown as DocumentNode<ConfigureGitHubSso_DisableGitHubSsoOnTeamMutation, ConfigureGitHubSso_DisableGitHubSsoOnTeamMutationVariables>;
export const ConfigureGitHubSso_InstallationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ConfigureGitHubSSO_installations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"teamAccount"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubLightInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghInstallations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GhApiInstallation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ConfigureGitHubSso_InstallationsQuery, ConfigureGitHubSso_InstallationsQueryVariables>;
export const ConfigureGitHubSso_EnableGitHubSsoOnTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfigureGitHubSSO_enableGitHubSSOOnTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ghInstallationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enableGitHubSSOOnTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"ghInstallationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ghInstallationId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamGitHubSSO_Team"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGitHubSSO_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"usageBased"}},{"kind":"Field","name":{"kind":"Name","value":"githubSsoIncluded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"ssoGithubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"}}]}}]}}]} as unknown as DocumentNode<ConfigureGitHubSso_EnableGitHubSsoOnTeamMutation, ConfigureGitHubSso_EnableGitHubSsoOnTeamMutationVariables>;
export const TeamMembers_TeamMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeamMembers_teamMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"team"},"name":{"kind":"Name","value":"teamById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"sso"},"value":{"kind":"BooleanValue","value":false}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelSelect_TeamMember"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<TeamMembers_TeamMembersQuery, TeamMembers_TeamMembersQueryVariables>;
export const TeamMembers_GithubMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeamMembers_githubMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"team"},"name":{"kind":"Name","value":"teamById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"teamMember"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelSelect_TeamMember"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserListRow_user"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserListRow_user"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<TeamMembers_GithubMembersQuery, TeamMembers_GithubMembersQueryVariables>;
export const TeamMembers_LeaveTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TeamMembers_leaveTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}]}}]}]}}]} as unknown as DocumentNode<TeamMembers_LeaveTeamMutation, TeamMembers_LeaveTeamMutationVariables>;
export const TeamMembers_RemoveUserFromTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TeamMembers_removeUserFromTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeUserFromTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"userAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamMemberId"}}]}}]}}]} as unknown as DocumentNode<TeamMembers_RemoveUserFromTeamMutation, TeamMembers_RemoveUserFromTeamMutationVariables>;
export const SetTeamMemberLevelMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetTeamMemberLevelMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TeamUserLevel"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setTeamMemberLevel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"userAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]} as unknown as DocumentNode<SetTeamMemberLevelMutationMutation, SetTeamMemberLevelMutationMutationVariables>;
export const NewTeam_CreateTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NewTeam_createTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redirectUrl"}}]}}]}}]} as unknown as DocumentNode<NewTeam_CreateTeamMutation, NewTeam_CreateTeamMutationVariables>;
export const TeamNewForm_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeamNewForm_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"hasSubscribedToTrial"}}]}}]}}]} as unknown as DocumentNode<TeamNewForm_MeQuery, TeamNewForm_MeQueryVariables>;
export const AccountSlack_UninstallSlackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountSlack_UninstallSlack"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uninstallSlack"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamSlack_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamSlack_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slackInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"teamName"}},{"kind":"Field","name":{"kind":"Name","value":"teamDomain"}}]}}]}}]} as unknown as DocumentNode<AccountSlack_UninstallSlackMutation, AccountSlack_UninstallSlackMutationVariables>;
export const UpgradeDialog_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UpgradeDialog_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"hasSubscribedToTrial"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<UpgradeDialog_MeQuery, UpgradeDialog_MeQueryVariables>;
export const GitHubAuth_DisconnectGitHubAuthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GitHubAuth_disconnectGitHubAuth"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disconnectGitHubAuth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitHubAuth_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitHubAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}}]} as unknown as DocumentNode<GitHubAuth_DisconnectGitHubAuthMutation, GitHubAuth_DisconnectGitHubAuthMutationVariables>;
export const GitLabAuth_DisconnectGitLabAuthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GitLabAuth_disconnectGitLabAuth"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disconnectGitLabAuth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitLabAuth_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitLabAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}}]} as unknown as DocumentNode<GitLabAuth_DisconnectGitLabAuthMutation, GitLabAuth_DisconnectGitLabAuthMutationVariables>;
export const GoogleAuth_DisconnectGoogleAuthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GoogleAuth_disconnectGoogleAuth"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disconnectGoogleAuth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GoogleAuth_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GoogleAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"googleUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"primaryEmail"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}}]} as unknown as DocumentNode<GoogleAuth_DisconnectGoogleAuthMutation, GoogleAuth_DisconnectGoogleAuthMutationVariables>;
export const AccountUsage_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountUsage_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"from"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DateTime"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TimeSeriesGroupBy"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"metrics"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"from"},"value":{"kind":"Variable","name":{"kind":"Name","value":"from"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"groupBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"screenshots"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"all"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"projects"}}]}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ts"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"projects"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"all"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"projects"}}]}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ts"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"projects"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<AccountUsage_AccountQuery, AccountUsage_AccountQueryVariables>;
export const NewProject_ImportGithubProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NewProject_importGithubProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"app"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GitHubAppType"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importGithubProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"app"},"value":{"kind":"Variable","name":{"kind":"Name","value":"app"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<NewProject_ImportGithubProjectMutation, NewProject_ImportGithubProjectMutationVariables>;
export const NewProject_ImportGitlabProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NewProject_importGitlabProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importGitlabProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"gitlabProjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<NewProject_ImportGitlabProjectMutation, NewProject_ImportGitlabProjectMutationVariables>;
export const AccountProjects_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountProjects_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectList_Project"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectList_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"latestBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AccountProjects_AccountQuery, AccountProjects_AccountQueryVariables>;
export const AccountSettings_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountSettings_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fineGrainedAccessControlIncluded"}}]}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamSlack_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamMembers_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamDelete_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountChangeName_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountChangeSlug_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PlanCard_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountGitLab_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamGitHubSSO_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamAccessRole_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamGitHubLight_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserAuth_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGithubMembersList_GithubAccount"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubAccount"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitHubAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitLabAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GoogleAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"googleUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"primaryEmail"}},{"kind":"Field","name":{"kind":"Name","value":"lastLoggedAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamSlack_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slackInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"teamName"}},{"kind":"Field","name":{"kind":"Name","value":"teamDomain"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamMembers_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"inviteLink"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"ssoGithubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamGithubMembersList_GithubAccount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fineGrainedAccessControlIncluded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamDelete_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeName_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeSlug_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanCard_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndDate"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"hasForcedPlan"}},{"kind":"Field","name":{"kind":"Name","value":"includedScreenshots"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"currentPeriodScreenshots"}}]}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountGitLab_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabBaseUrl"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGitHubSSO_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"usageBased"}},{"kind":"Field","name":{"kind":"Name","value":"githubSsoIncluded"}}]}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"ssoGithubAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubAccountLink_GithubAccount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamAccessRole_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamGitHubLight_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"githubLightInstallation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserAuth_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitHubAuth_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitLabAuth_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GoogleAuth_Account"}}]}}]}}]} as unknown as DocumentNode<AccountSettings_AccountQuery, AccountSettings_AccountQueryVariables>;
export const Account_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Account_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}}]}}]}}]} as unknown as DocumentNode<Account_AccountQuery, Account_AccountQueryVariables>;
export const BuildDiffState_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildDiffState_Project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotDiffs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDiffState_ScreenshotDiff"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDiffState_ScreenshotDiff"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ScreenshotDiff"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"threshold"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}},{"kind":"Field","name":{"kind":"Name","value":"retry"}},{"kind":"Field","name":{"kind":"Name","value":"retries"}},{"kind":"Field","name":{"kind":"Name","value":"repeat"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}},{"kind":"Field","name":{"kind":"Name","value":"retry"}},{"kind":"Field","name":{"kind":"Name","value":"retries"}},{"kind":"Field","name":{"kind":"Name","value":"repeat"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"playwrightTraceUrl"}}]}}]}}]} as unknown as DocumentNode<BuildDiffState_ProjectQuery, BuildDiffState_ProjectQueryVariables>;
export const BuildPage_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildPage_Project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildReviewDialog_Project"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"OvercapacityBanner_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDiffState_Build"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildOrphanDialog_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"testReport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranchResolvedFrom"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"merged"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildOrphanDialog_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatsIndicator_BuildStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BuildStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}},{"kind":"Field","name":{"kind":"Name","value":"retryFailure"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildReviewButton_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildOrphanDialog_Project"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildReviewDialog_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildReviewButton_Project"}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"usageBased"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestButton_PullRequest"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildOrphanDialog_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDiffState_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatsIndicator_BuildStats"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}},{"kind":"Field","name":{"kind":"Name","value":"retryFailure"}}]}}]}}]} as unknown as DocumentNode<BuildPage_ProjectQuery, BuildPage_ProjectQueryVariables>;
export const BuildReviewAction_SetValidationStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BuildReviewAction_setValidationStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setValidationStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"buildId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}}},{"kind":"Argument","name":{"kind":"Name","value":"validationStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<BuildReviewAction_SetValidationStatusMutation, BuildReviewAction_SetValidationStatusMutationVariables>;
export const Invite_InvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Invite_invitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<Invite_InvitationQuery, Invite_InvitationQueryVariables>;
export const Invite_AcceptInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Invite_acceptInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<Invite_AcceptInvitationMutation, Invite_AcceptInvitationMutationVariables>;
export const ProjectBuilds_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBuilds_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buildNames"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GettingStarted_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GettingStarted_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]} as unknown as DocumentNode<ProjectBuilds_ProjectQuery, ProjectBuilds_ProjectQueryVariables>;
export const ProjectBuilds_Project_BuildsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBuilds_project_Builds"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}},{"kind":"Argument","name":{"kind":"Name","value":"buildName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"buildName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatsIndicator_BuildStats"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestButton_PullRequest"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"parallel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"received"}},{"kind":"Field","name":{"kind":"Name","value":"nonce"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatsIndicator_BuildStats"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"BuildStats"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}},{"kind":"Field","name":{"kind":"Name","value":"retryFailure"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<ProjectBuilds_Project_BuildsQuery, ProjectBuilds_Project_BuildsQueryVariables>;
export const ProjectLatestAutoApproved_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectLatestAutoApproved_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"latestAutoApprovedBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectLatestAutoApproved_ProjectQuery, ProjectLatestAutoApproved_ProjectQueryVariables>;
export const ProjectSettings_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectSettings_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fineGrainedAccessControlIncluded"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectBadge_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectChangeName_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectToken_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectBranches_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectStatusChecks_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectVisibility_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectDelete_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectContributors_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDefaultUserLevel_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectBadge_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectChangeName_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectToken_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectBranches_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"customDefaultBaseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"customAutoApprovedBranchGlob"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectStatusChecks_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"summaryCheck"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVisibility_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDelete_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectContributors_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"defaultUserLevel"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectDefaultUserLevel_Project"}}]}}]} as unknown as DocumentNode<ProjectSettings_ProjectQuery, ProjectSettings_ProjectQueryVariables>;
export const Project_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Project_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}}]}}]}}]} as unknown as DocumentNode<Project_ProjectQuery, Project_ProjectQueryVariables>;