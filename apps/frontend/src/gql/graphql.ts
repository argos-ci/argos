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
  Time: { input: any; output: any; }
};

export type Account = {
  avatar: AccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']['output']>;
  currentMonthUsedScreenshots: Scalars['Int']['output'];
  ghAccount?: Maybe<GithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<GlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasPaidPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  paymentProvider?: Maybe<PurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  purchase?: Maybe<Purchase>;
  purchaseStatus?: Maybe<PurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  trialStatus?: Maybe<TrialStatus>;
  vercelConfiguration?: Maybe<VercelConfiguration>;
};


export type AccountProjectsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
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

export type Build = Node & {
  __typename?: 'Build';
  /** The screenshot bucket of the baselineBranch */
  baseScreenshotBucket?: Maybe<ScreenshotBucket>;
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
  pullRequest?: Maybe<PullRequest>;
  /** The screenshot diffs between the base screenshot bucket of the compare screenshot bucket */
  screenshotDiffs: ScreenshotDiffConnection;
  /** Build stats */
  stats: BuildStats;
  /** Review status, conclusion or job status */
  status: BuildStatus;
  /** Expected batch count */
  totalBatch?: Maybe<Scalars['Int']['output']>;
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

export type BuildStats = {
  __typename?: 'BuildStats';
  added: Scalars['Int']['output'];
  changed: Scalars['Int']['output'];
  failure: Scalars['Int']['output'];
  removed: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  unchanged: Scalars['Int']['output'];
};

export enum BuildStatus {
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

export enum BuildType {
  /** Comparison build */
  Check = 'check',
  /** No reference build to compare */
  Orphan = 'orphan',
  /** Build on reference branch */
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

export type GithubAccount = Node & {
  __typename?: 'GithubAccount';
  id: Scalars['ID']['output'];
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
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

export type GlApiNamespace = Node & {
  __typename?: 'GlApiNamespace';
  id: Scalars['ID']['output'];
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

export type ImportGithubProjectInput = {
  accountSlug: Scalars['String']['input'];
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
  owner: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  repo: Scalars['String']['input'];
};

export type LinkGitlabProjectInput = {
  gitlabProjectId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};

export type LinkVercelProjectInput = {
  configurationId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
  vercelProjectId: Scalars['ID']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Accept an invitation to join a team */
  acceptInvitation: Team;
  /** Create a team */
  createTeam: CreateTeamResult;
  /** Delete Project */
  deleteProject: Scalars['Boolean']['output'];
  /** Delete team and all its projects */
  deleteTeam: Scalars['Boolean']['output'];
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
  /** Link Vercel project */
  linkVercelProject: Project;
  /** Mute or unmute tests */
  muteTests: MuteUpdateTest;
  ping: Scalars['Boolean']['output'];
  /** Remove a user from a team */
  removeUserFromTeam: RemoveUserFromTeamPayload;
  /** Retrieve a Vercel API token from a code */
  retrieveVercelToken: VercelApiToken;
  /** Set member level */
  setTeamMemberLevel: TeamMember;
  /** Change the validationStatus on a build */
  setValidationStatus: Build;
  /** Finish the Vercel integration setup */
  setupVercelIntegration?: Maybe<Scalars['Boolean']['output']>;
  /** Terminate trial early */
  terminateTrial: Account;
  /** Transfer Project to another account */
  transferProject: Project;
  /** Unlink GitHub Repository */
  unlinkGithubRepository: Project;
  /** Unlink Gitlab Project */
  unlinkGitlabProject: Project;
  /** Unlink Vercel project */
  unlinkVercelProject: Project;
  /** Update Account */
  updateAccount: Account;
  /** Update Project */
  updateProject: Project;
  /** Set project pull request comment */
  updateProjectPrComment: Project;
  /** Update test statuses */
  updateTestStatuses: UpdatedTestStatuses;
};


export type MutationAcceptInvitationArgs = {
  token: Scalars['String']['input'];
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


export type MutationLinkVercelProjectArgs = {
  input: LinkVercelProjectInput;
};


export type MutationMuteTestsArgs = {
  ids: Array<Scalars['String']['input']>;
  muteUntil?: InputMaybe<Scalars['String']['input']>;
  muted: Scalars['Boolean']['input'];
};


export type MutationRemoveUserFromTeamArgs = {
  input: RemoveUserFromTeamInput;
};


export type MutationRetrieveVercelTokenArgs = {
  code: Scalars['String']['input'];
};


export type MutationSetTeamMemberLevelArgs = {
  input: SetTeamMemberLevelInput;
};


export type MutationSetValidationStatusArgs = {
  buildId: Scalars['ID']['input'];
  validationStatus: ValidationStatus;
};


export type MutationSetupVercelIntegrationArgs = {
  input: SetupVercelIntegrationInput;
};


export type MutationTerminateTrialArgs = {
  accountId: Scalars['ID']['input'];
};


export type MutationTransferProjectArgs = {
  input: TransferProjectInput;
};


export type MutationUnlinkGithubRepositoryArgs = {
  input: UnlinkGithubRepositoryInput;
};


export type MutationUnlinkGitlabProjectArgs = {
  input: UnlinkGitlabProjectInput;
};


export type MutationUnlinkVercelProjectArgs = {
  input: UnlinkVercelProjectInput;
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


export type MutationUpdateTestStatusesArgs = {
  ids: Array<Scalars['String']['input']>;
  status: TestStatus;
};

export type MuteUpdateTest = {
  __typename?: 'MuteUpdateTest';
  ids: Array<Scalars['String']['output']>;
  mute: Scalars['Boolean']['output'];
  muteUntil?: Maybe<Scalars['String']['output']>;
};

export type Node = {
  id: Scalars['ID']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean']['output'];
  totalCount: Scalars['Int']['output'];
};

export enum Permission {
  Read = 'read',
  Write = 'write'
}

export type Plan = Node & {
  __typename?: 'Plan';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  screenshotsLimitPerMonth: Scalars['Int']['output'];
};

export type Project = Node & {
  __typename?: 'Project';
  /** Owner of the repository */
  account: Account;
  /** Override branch name */
  baselineBranch?: Maybe<Scalars['String']['output']>;
  /** A single build linked to the repository */
  build?: Maybe<Build>;
  /** Build names */
  buildNames: Array<Scalars['String']['output']>;
  /** Builds associated to the repository */
  builds: BuildConnection;
  /** Current month used screenshots */
  currentMonthUsedScreenshots: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** Latest build */
  latestBuild?: Maybe<Build>;
  /** Reference build */
  latestReferenceBuild?: Maybe<Build>;
  name: Scalars['String']['output'];
  /** Determine if the current user has write access to the project */
  permissions: Array<Permission>;
  /** Pull request comment enabled */
  prCommentEnabled: Scalars['Boolean']['output'];
  /** Override repository's Github privacy */
  private?: Maybe<Scalars['Boolean']['output']>;
  /** Check if the project is public or not */
  public: Scalars['Boolean']['output'];
  /** Reference branch */
  referenceBranch: Scalars['String']['output'];
  /** Repository associated to the project */
  repository?: Maybe<Repository>;
  /** Project slug */
  slug: Scalars['String']['output'];
  /** Summary check */
  summaryCheck: SummaryCheck;
  /** Tests associated to the repository */
  tests: TestConnection;
  token?: Maybe<Scalars['String']['output']>;
  /** Total screenshots used */
  totalScreenshots: Scalars['Int']['output'];
  /** Vercel project */
  vercelProject?: Maybe<VercelProject>;
};


export type ProjectBuildArgs = {
  number: Scalars['Int']['input'];
};


export type ProjectBuildsArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  buildName?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type ProjectTestsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
};

export type ProjectConnection = Connection & {
  __typename?: 'ProjectConnection';
  edges: Array<Project>;
  pageInfo: PageInfo;
};

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

export type Purchase = Node & {
  __typename?: 'Purchase';
  id: Scalars['ID']['output'];
  paymentMethodFilled: Scalars['Boolean']['output'];
  source: PurchaseSource;
  trialDaysRemaining?: Maybe<Scalars['Int']['output']>;
};

export enum PurchaseSource {
  Github = 'github',
  Stripe = 'stripe'
}

export enum PurchaseStatus {
  /** Ongoing paid purchase */
  Active = 'active',
  /** Post-cancelation date */
  Canceled = 'canceled',
  /** No paid purchase */
  Missing = 'missing',
  /** Payment due */
  PastDue = 'past_due',
  /** Ongoing trial */
  Trialing = 'trialing'
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
  /** Get Vercel projects from API */
  vercelApiProjects: VercelApiProjectConnection;
  /** Get a Vercel Team From API */
  vercelApiTeam?: Maybe<VercelApiTeam>;
};


export type QueryAccountArgs = {
  slug: Scalars['String']['input'];
};


export type QueryAccountByIdArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGhApiInstallationRepositoriesArgs = {
  installationId: Scalars['ID']['input'];
  page: Scalars['Int']['input'];
  reposPerPage?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGlApiProjectsArgs = {
  accessToken: Scalars['String']['input'];
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


export type QueryVercelApiProjectsArgs = {
  accessToken: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  teamId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryVercelApiTeamArgs = {
  accessToken: Scalars['String']['input'];
  id: Scalars['ID']['input'];
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
  branch: Scalars['String']['output'];
  commit: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
};

export type ScreenshotDiff = Node & {
  __typename?: 'ScreenshotDiff';
  baseScreenshot?: Maybe<Screenshot>;
  compareScreenshot?: Maybe<Screenshot>;
  createdAt: Scalars['DateTime']['output'];
  flakyDetected: Scalars['Boolean']['output'];
  group?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  status: ScreenshotDiffStatus;
  test?: Maybe<Test>;
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
  Removed = 'removed',
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
  title: Scalars['String']['output'];
  titlePath: Array<Scalars['String']['output']>;
};

export type ScreenshotMetadataViewport = {
  __typename?: 'ScreenshotMetadataViewport';
  height: Scalars['Int']['output'];
  width: Scalars['Int']['output'];
};

export type SetTeamMemberLevelInput = {
  level: TeamUserLevel;
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
};

export type SetupVercelIntegrationInput = {
  accountId: Scalars['ID']['input'];
  projects: Array<SetupVercelIntegrationProjectInput>;
  vercelAccessToken: Scalars['String']['input'];
  vercelConfigurationId: Scalars['ID']['input'];
  vercelTeamId?: InputMaybe<Scalars['ID']['input']>;
};

export type SetupVercelIntegrationProjectInput = {
  projectId: Scalars['ID']['input'];
  vercelProjectId: Scalars['ID']['input'];
};

export enum SummaryCheck {
  Always = 'always',
  Auto = 'auto',
  Never = 'never'
}

export type Team = Account & Node & {
  __typename?: 'Team';
  avatar: AccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']['output']>;
  currentMonthUsedScreenshots: Scalars['Int']['output'];
  ghAccount?: Maybe<GithubAccount>;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<GlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasPaidPlan: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  inviteLink: Scalars['String']['output'];
  me: TeamMember;
  members: TeamMemberConnection;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidPurchase?: Maybe<Purchase>;
  paymentProvider?: Maybe<PurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  purchase?: Maybe<Purchase>;
  purchaseStatus?: Maybe<PurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  trialStatus?: Maybe<TrialStatus>;
  vercelConfiguration?: Maybe<VercelConfiguration>;
};


export type TeamMembersArgs = {
  after?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type TeamProjectsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
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
  Member = 'member',
  Owner = 'owner'
}

export type Test = Node & {
  __typename?: 'Test';
  buildName: Scalars['String']['output'];
  dailyChanges: Array<DailyCount>;
  id: Scalars['ID']['output'];
  lastSeen?: Maybe<Scalars['DateTime']['output']>;
  mute: Scalars['Boolean']['output'];
  muteUntil?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  resolvedDate?: Maybe<Scalars['DateTime']['output']>;
  screenshot?: Maybe<Screenshot>;
  stabilityScore?: Maybe<Scalars['Int']['output']>;
  status: TestStatus;
  totalBuilds: Scalars['Int']['output'];
  unstable: Scalars['Boolean']['output'];
};

export type TestConnection = Connection & {
  __typename?: 'TestConnection';
  edges: Array<Test>;
  pageInfo: PageInfo;
};

export enum TestStatus {
  Flaky = 'flaky',
  Pending = 'pending',
  Resolved = 'resolved'
}

export type TransferProjectInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  targetAccountId: Scalars['ID']['input'];
};

export enum TrialStatus {
  /** Trial is active */
  Active = 'active',
  /** Subscription ended when trial did */
  Expired = 'expired'
}

export type UnlinkGithubRepositoryInput = {
  projectId: Scalars['ID']['input'];
};

export type UnlinkGitlabProjectInput = {
  projectId: Scalars['ID']['input'];
};

export type UnlinkVercelProjectInput = {
  projectId: Scalars['ID']['input'];
};

export type UpdateAccountInput = {
  gitlabAccessToken?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  baselineBranch?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  summaryCheck?: InputMaybe<SummaryCheck>;
};

export type UpdateProjectPrCommentInput = {
  enable: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};

export type UpdatedTestStatuses = {
  __typename?: 'UpdatedTestStatuses';
  ids: Array<Scalars['String']['output']>;
  status: TestStatus;
};

export type User = Account & Node & {
  __typename?: 'User';
  avatar: AccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']['output']>;
  currentMonthUsedScreenshots: Scalars['Int']['output'];
  ghAccount?: Maybe<GithubAccount>;
  ghInstallations: GhApiInstallationConnection;
  gitlabAccessToken?: Maybe<Scalars['String']['output']>;
  glNamespaces?: Maybe<GlApiNamespaceConnection>;
  hasForcedPlan: Scalars['Boolean']['output'];
  hasPaidPlan: Scalars['Boolean']['output'];
  hasSubscribedToTrial: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  lastPurchase?: Maybe<Purchase>;
  name?: Maybe<Scalars['String']['output']>;
  oldPaidPurchase?: Maybe<Purchase>;
  paymentProvider?: Maybe<PurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']['output']>;
  periodEndDate?: Maybe<Scalars['DateTime']['output']>;
  periodStartDate?: Maybe<Scalars['DateTime']['output']>;
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  purchase?: Maybe<Purchase>;
  purchaseStatus?: Maybe<PurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']['output']>;
  slug: Scalars['String']['output'];
  stripeClientReferenceId: Scalars['String']['output'];
  stripeCustomerId?: Maybe<Scalars['String']['output']>;
  teams: Array<Team>;
  trialStatus?: Maybe<TrialStatus>;
  vercelConfiguration?: Maybe<VercelConfiguration>;
};


export type UserProjectsArgs = {
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
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

export type VercelApiPagination = {
  __typename?: 'VercelApiPagination';
  count: Scalars['Int']['output'];
  next?: Maybe<Scalars['ID']['output']>;
  prev?: Maybe<Scalars['ID']['output']>;
};

export type VercelApiProject = {
  __typename?: 'VercelApiProject';
  id: Scalars['ID']['output'];
  link?: Maybe<VercelApiProjectLink>;
  linkedProject?: Maybe<Project>;
  name: Scalars['String']['output'];
  project?: Maybe<Project>;
  status: VercelApiProjectStatus;
};


export type VercelApiProjectStatusArgs = {
  accountId: Scalars['ID']['input'];
};

export type VercelApiProjectConnection = {
  __typename?: 'VercelApiProjectConnection';
  pagination: VercelApiPagination;
  projects: Array<VercelApiProject>;
};

export type VercelApiProjectLink = {
  type: Scalars['String']['output'];
};

export type VercelApiProjectLinkGithub = VercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkGithub';
  org: Scalars['String']['output'];
  repo: Scalars['String']['output'];
  repoId: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type VercelApiProjectLinkOther = VercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkOther';
  type: Scalars['String']['output'];
};

export enum VercelApiProjectStatus {
  Linked = 'LINKED',
  LinkedToOtherTeam = 'LINKED_TO_OTHER_TEAM',
  NoProvider = 'NO_PROVIDER',
  ProviderNotSupported = 'PROVIDER_NOT_SUPPORTED',
  ReadyForLink = 'READY_FOR_LINK',
  RequireGithubAccess = 'REQUIRE_GITHUB_ACCESS',
  UnknownError = 'UNKNOWN_ERROR'
}

export type VercelApiTeam = {
  __typename?: 'VercelApiTeam';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type VercelApiToken = {
  __typename?: 'VercelApiToken';
  access_token: Scalars['String']['output'];
  installation_id: Scalars['String']['output'];
  team_id?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['String']['output'];
};

export type VercelConfiguration = {
  __typename?: 'VercelConfiguration';
  apiProjects?: Maybe<VercelApiProjectConnection>;
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
  vercelId: Scalars['ID']['output'];
};

export type VercelProject = {
  __typename?: 'VercelProject';
  configuration: VercelConfiguration;
  id: Scalars['ID']['output'];
};

export type DailyCount = {
  __typename?: 'dailyCount';
  count: Scalars['Int']['output'];
  date: Scalars['Date']['output'];
};

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

type AccountGitLab_Account_Team_Fragment = { __typename?: 'Team', id: string, permissions: Array<Permission>, gitlabAccessToken?: string | null } & { ' $fragmentName'?: 'AccountGitLab_Account_Team_Fragment' };

type AccountGitLab_Account_User_Fragment = { __typename?: 'User', id: string, permissions: Array<Permission>, gitlabAccessToken?: string | null } & { ' $fragmentName'?: 'AccountGitLab_Account_User_Fragment' };

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

type AccountPlanChip_Account_Team_Fragment = { __typename?: 'Team', purchaseStatus?: PurchaseStatus | null, plan?: { __typename?: 'Plan', id: string, name: string } | null } & { ' $fragmentName'?: 'AccountPlanChip_Account_Team_Fragment' };

type AccountPlanChip_Account_User_Fragment = { __typename?: 'User', purchaseStatus?: PurchaseStatus | null, plan?: { __typename?: 'Plan', id: string, name: string } | null } & { ' $fragmentName'?: 'AccountPlanChip_Account_User_Fragment' };

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

export type BuildStatusChip_ProjectFragment = (
  { __typename?: 'Project' }
  & { ' $fragmentRefs'?: { 'BuildStatusDescription_ProjectFragment': BuildStatusDescription_ProjectFragment } }
) & { ' $fragmentName'?: 'BuildStatusChip_ProjectFragment' };

export type BuildStatusDescription_BuildFragment = { __typename?: 'Build', type?: BuildType | null, status: BuildStatus, batchCount?: number | null, totalBatch?: number | null, stats: { __typename?: 'BuildStats', total: number } } & { ' $fragmentName'?: 'BuildStatusDescription_BuildFragment' };

export type BuildStatusDescription_ProjectFragment = { __typename?: 'Project', referenceBranch: string } & { ' $fragmentName'?: 'BuildStatusDescription_ProjectFragment' };

export type GithubInstallationsSelect_GhApiInstallationFragment = { __typename?: 'GhApiInstallation', id: string, account: { __typename?: 'GhApiInstallationAccount', id: string, login: string, name?: string | null } } & { ' $fragmentName'?: 'GithubInstallationsSelect_GhApiInstallationFragment' };

export type GithubRepositoryList_GhApiInstallationRepositoriesQueryVariables = Exact<{
  installationId: Scalars['ID']['input'];
  page: Scalars['Int']['input'];
  reposPerPage?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GithubRepositoryList_GhApiInstallationRepositoriesQuery = { __typename?: 'Query', ghApiInstallationRepositories: { __typename?: 'GhApiRepositoryConnection', edges: Array<{ __typename?: 'GhApiRepository', id: string, name: string, updated_at: string, owner_login: string }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, totalCount: number } } };

export type GitlabNamespacesSelect_GlApiNamespaceFragment = { __typename?: 'GlApiNamespace', id: string, name: string, path: string } & { ' $fragmentName'?: 'GitlabNamespacesSelect_GlApiNamespaceFragment' };

export type GitlabProjectList_GlApiProjectsQueryVariables = Exact<{
  userId?: InputMaybe<Scalars['ID']['input']>;
  groupId?: InputMaybe<Scalars['ID']['input']>;
  allProjects: Scalars['Boolean']['input'];
  accessToken: Scalars['String']['input'];
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

type PaymentBanner_Account_Team_Fragment = { __typename?: 'Team', id: string, purchaseStatus?: PurchaseStatus | null, permissions: Array<Permission>, stripeCustomerId?: string | null, pendingCancelAt?: any | null, purchase?: { __typename?: 'Purchase', id: string, trialDaysRemaining?: number | null, source: PurchaseSource, paymentMethodFilled: boolean } | null } & { ' $fragmentName'?: 'PaymentBanner_Account_Team_Fragment' };

type PaymentBanner_Account_User_Fragment = { __typename?: 'User', id: string, purchaseStatus?: PurchaseStatus | null, permissions: Array<Permission>, stripeCustomerId?: string | null, pendingCancelAt?: any | null, purchase?: { __typename?: 'Purchase', id: string, trialDaysRemaining?: number | null, source: PurchaseSource, paymentMethodFilled: boolean } | null } & { ' $fragmentName'?: 'PaymentBanner_Account_User_Fragment' };

export type PaymentBanner_AccountFragment = PaymentBanner_Account_Team_Fragment | PaymentBanner_Account_User_Fragment;

export type PaymentBanner_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentBanner_MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, hasSubscribedToTrial: boolean } | null };

export type TerminateTrialMutationVariables = Exact<{
  accountId: Scalars['ID']['input'];
}>;


export type TerminateTrialMutation = { __typename?: 'Mutation', terminateTrial: { __typename: 'Team', id: string, purchaseStatus?: PurchaseStatus | null } | { __typename: 'User', id: string, purchaseStatus?: PurchaseStatus | null } };

type PlanCard_Account_Team_Fragment = { __typename?: 'Team', id: string, stripeCustomerId?: string | null, periodStartDate?: any | null, periodEndDate?: any | null, purchaseStatus?: PurchaseStatus | null, trialStatus?: TrialStatus | null, hasForcedPlan: boolean, pendingCancelAt?: any | null, paymentProvider?: PurchaseSource | null, plan?: { __typename?: 'Plan', id: string, name: string, screenshotsLimitPerMonth: number } | null, purchase?: { __typename?: 'Purchase', id: string, paymentMethodFilled: boolean } | null, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string, public: boolean, currentMonthUsedScreenshots: number }> } } & { ' $fragmentName'?: 'PlanCard_Account_Team_Fragment' };

type PlanCard_Account_User_Fragment = { __typename?: 'User', id: string, stripeCustomerId?: string | null, periodStartDate?: any | null, periodEndDate?: any | null, purchaseStatus?: PurchaseStatus | null, trialStatus?: TrialStatus | null, hasForcedPlan: boolean, pendingCancelAt?: any | null, paymentProvider?: PurchaseSource | null, plan?: { __typename?: 'Plan', id: string, name: string, screenshotsLimitPerMonth: number } | null, purchase?: { __typename?: 'Purchase', id: string, paymentMethodFilled: boolean } | null, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string, public: boolean, currentMonthUsedScreenshots: number }> } } & { ' $fragmentName'?: 'PlanCard_Account_User_Fragment' };

export type PlanCard_AccountFragment = PlanCard_Account_Team_Fragment | PlanCard_Account_User_Fragment;

export type ProjectBadge_ProjectFragment = { __typename?: 'Project', id: string, slug: string } & { ' $fragmentName'?: 'ProjectBadge_ProjectFragment' };

export type ProjectChangeName_ProjectFragment = { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } & { ' $fragmentName'?: 'ProjectChangeName_ProjectFragment' };

export type ProjectChangeName_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type ProjectChangeName_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, name: string } };

export type ConnectRepositoryQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
}>;


export type ConnectRepositoryQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, gitlabAccessToken?: string | null, permissions: Array<Permission>, glNamespaces?: { __typename?: 'GlApiNamespaceConnection', edges: Array<(
        { __typename?: 'GlApiNamespace', id: string, kind: string }
        & { ' $fragmentRefs'?: { 'GitlabNamespacesSelect_GlApiNamespaceFragment': GitlabNamespacesSelect_GlApiNamespaceFragment } }
      )> } | null } | { __typename?: 'User', id: string, gitlabAccessToken?: string | null, permissions: Array<Permission>, glNamespaces?: { __typename?: 'GlApiNamespaceConnection', edges: Array<(
        { __typename?: 'GlApiNamespace', id: string, kind: string }
        & { ' $fragmentRefs'?: { 'GitlabNamespacesSelect_GlApiNamespaceFragment': GitlabNamespacesSelect_GlApiNamespaceFragment } }
      )> } | null } | null, me?: { __typename?: 'User', id: string, ghInstallations: { __typename?: 'GhApiInstallationConnection', edges: Array<(
        { __typename?: 'GhApiInstallation', id: string }
        & { ' $fragmentRefs'?: { 'GithubInstallationsSelect_GhApiInstallationFragment': GithubInstallationsSelect_GhApiInstallationFragment } }
      )>, pageInfo: { __typename?: 'PageInfo', totalCount: number } } } | null };

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
  id: Scalars['ID']['input'];
  enable: Scalars['Boolean']['input'];
}>;


export type ProjectGitRepository_UpdateEnablePrCommentMutation = { __typename?: 'Mutation', updateProjectPrComment: { __typename?: 'Project', id: string, prCommentEnabled: boolean } };

export type ProjectReferenceBranch_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  baselineBranch?: InputMaybe<Scalars['String']['input']>;
}>;


export type ProjectReferenceBranch_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, baselineBranch?: string | null } };

export type ProjectReferenceBranch_ProjectFragment = { __typename?: 'Project', id: string, baselineBranch?: string | null, repository?: { __typename: 'GithubRepository', id: string, defaultBranch: string } | { __typename: 'GitlabProject', id: string, defaultBranch: string } | null } & { ' $fragmentName'?: 'ProjectReferenceBranch_ProjectFragment' };

export type ProjectStatusChecks_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  summaryCheck?: InputMaybe<SummaryCheck>;
}>;


export type ProjectStatusChecks_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, summaryCheck: SummaryCheck } };

export type ProjectStatusChecks_ProjectFragment = { __typename?: 'Project', id: string, summaryCheck: SummaryCheck } & { ' $fragmentName'?: 'ProjectStatusChecks_ProjectFragment' };

export type ProjectToken_ProjectFragment = { __typename?: 'Project', token?: string | null } & { ' $fragmentName'?: 'ProjectToken_ProjectFragment' };

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
    { __typename?: 'Team', id: string, plan?: { __typename?: 'Plan', id: string, name: string } | null }
    & { ' $fragmentRefs'?: { 'ProjectTransfer_Account_Team_Fragment': ProjectTransfer_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, plan?: { __typename?: 'Plan', id: string, name: string } | null }
    & { ' $fragmentRefs'?: { 'ProjectTransfer_Account_User_Fragment': ProjectTransfer_Account_User_Fragment } }
  ) | null, targetAccount?: (
    { __typename?: 'Team', id: string, plan?: { __typename?: 'Plan', id: string, name: string } | null }
    & { ' $fragmentRefs'?: { 'ProjectTransfer_Account_Team_Fragment': ProjectTransfer_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, plan?: { __typename?: 'Plan', id: string, name: string } | null }
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

export type ReviewButton_ProjectFragment = { __typename?: 'Project', name: string, permissions: Array<Permission>, public: boolean, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string }, build?: { __typename?: 'Build', id: string, status: BuildStatus } | null } & { ' $fragmentName'?: 'ReviewButton_ProjectFragment' };

export type SetValidationStatusMutationVariables = Exact<{
  buildId: Scalars['ID']['input'];
  validationStatus: ValidationStatus;
}>;


export type SetValidationStatusMutation = { __typename?: 'Mutation', setValidationStatus: { __typename?: 'Build', id: string, status: BuildStatus } };

export type TeamDelete_TeamFragment = { __typename?: 'Team', id: string, slug: string, purchaseStatus?: PurchaseStatus | null, pendingCancelAt?: any | null } & { ' $fragmentName'?: 'TeamDelete_TeamFragment' };

export type DeleteTeamMutationMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
}>;


export type DeleteTeamMutationMutation = { __typename?: 'Mutation', deleteTeam: boolean };

export type TeamMembers_TeamMembersQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  first: Scalars['Int']['input'];
  after: Scalars['Int']['input'];
}>;


export type TeamMembers_TeamMembersQuery = { __typename?: 'Query', team?: { __typename?: 'Team', id: string, members: { __typename?: 'TeamMemberConnection', edges: Array<(
        { __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: (
          { __typename?: 'User', id: string, name?: string | null, slug: string, avatar: (
            { __typename?: 'AccountAvatar' }
            & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
          ) }
          & { ' $fragmentRefs'?: { 'RemoveFromTeamDialog_UserFragment': RemoveFromTeamDialog_UserFragment } }
        ) }
        & { ' $fragmentRefs'?: { 'LevelSelect_TeamMemberFragment': LevelSelect_TeamMemberFragment } }
      )>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, totalCount: number } } } | null };

export type TeamMembers_TeamFragment = { __typename?: 'Team', id: string, name?: string | null, slug: string, inviteLink: string, me: (
    { __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: (
      { __typename?: 'User', id: string, name?: string | null, slug: string, avatar: (
        { __typename?: 'AccountAvatar' }
        & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
      ) }
      & { ' $fragmentRefs'?: { 'RemoveFromTeamDialog_UserFragment': RemoveFromTeamDialog_UserFragment } }
    ) }
    & { ' $fragmentRefs'?: { 'LevelSelect_TeamMemberFragment': LevelSelect_TeamMemberFragment } }
  ) } & { ' $fragmentName'?: 'TeamMembers_TeamFragment' };

export type TeamMembers_LeaveTeamMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
}>;


export type TeamMembers_LeaveTeamMutation = { __typename?: 'Mutation', leaveTeam: boolean };

export type TeamMembers_RemoveUserFromTeamMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
}>;


export type TeamMembers_RemoveUserFromTeamMutation = { __typename?: 'Mutation', removeUserFromTeam: { __typename?: 'RemoveUserFromTeamPayload', teamMemberId: string } };

export type RemoveFromTeamDialog_UserFragment = { __typename?: 'User', id: string, name?: string | null, slug: string, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) } & { ' $fragmentName'?: 'RemoveFromTeamDialog_UserFragment' };

export type SetTeamMemberLevelMutationMutationVariables = Exact<{
  teamAccountId: Scalars['ID']['input'];
  userAccountId: Scalars['ID']['input'];
  level: TeamUserLevel;
}>;


export type SetTeamMemberLevelMutationMutation = { __typename?: 'Mutation', setTeamMemberLevel: { __typename?: 'TeamMember', id: string, level: TeamUserLevel } };

export type LevelSelect_TeamMemberFragment = { __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: { __typename?: 'User', id: string } } & { ' $fragmentName'?: 'LevelSelect_TeamMemberFragment' };

export type NewTeam_CreateTeamMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type NewTeam_CreateTeamMutation = { __typename?: 'Mutation', createTeam: { __typename?: 'CreateTeamResult', redirectUrl: string } };

export type TeamNewForm_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type TeamNewForm_MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, stripeCustomerId?: string | null, hasSubscribedToTrial: boolean } | null };

export type UpgradeDialog_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type UpgradeDialog_MeQuery = { __typename?: 'Query', me?: (
    { __typename?: 'User', id: string, slug: string, hasSubscribedToTrial: boolean, teams: Array<(
      { __typename?: 'Team', id: string, slug: string, hasPaidPlan: boolean }
      & { ' $fragmentRefs'?: { 'AccountItem_Account_Team_Fragment': AccountItem_Account_Team_Fragment } }
    )> }
    & { ' $fragmentRefs'?: { 'AccountItem_Account_User_Fragment': AccountItem_Account_User_Fragment } }
  ) | null };

export type Vercel_VercelApiTeamQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  accessToken: Scalars['String']['input'];
}>;


export type Vercel_VercelApiTeamQuery = { __typename?: 'Query', vercelApiTeam?: { __typename?: 'VercelApiTeam', id: string, name: string, slug: string } | null };

export type Vercel_CreateTeamMutationVariables = Exact<{
  name: Scalars['String']['input'];
}>;


export type Vercel_CreateTeamMutation = { __typename?: 'Mutation', createTeam: { __typename?: 'CreateTeamResult', team: { __typename?: 'Team', id: string, slug: string } } };

export type ChooseTeam_TeamFragment = { __typename?: 'Team', id: string, name?: string | null, slug: string, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) } & { ' $fragmentName'?: 'ChooseTeam_TeamFragment' };

export type FromTeam_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type FromTeam_MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, teams: Array<(
      { __typename?: 'Team', id: string }
      & { ' $fragmentRefs'?: { 'ChooseTeam_TeamFragment': ChooseTeam_TeamFragment } }
    )> } | null };

export type VercelProjectsSummary_Me_VercelApiProjectsQueryVariables = Exact<{
  teamId?: InputMaybe<Scalars['ID']['input']>;
  accessToken: Scalars['String']['input'];
  accountId: Scalars['ID']['input'];
}>;


export type VercelProjectsSummary_Me_VercelApiProjectsQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, ghInstallations: { __typename?: 'GhApiInstallationConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number } } } | null, vercelApiProjects: { __typename?: 'VercelApiProjectConnection', projects: Array<{ __typename?: 'VercelApiProject', id: string, name: string, status: VercelApiProjectStatus, linkedProject?: { __typename?: 'Project', id: string } | null, link?: { __typename: 'VercelApiProjectLinkGithub', org: string, repo: string, repoId: number, type: string } | { __typename: 'VercelApiProjectLinkOther', type: string } | null }> } };

export type VercelProjectsSummary_ImportGithubProjectMutationVariables = Exact<{
  repo: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  accountSlug: Scalars['String']['input'];
}>;


export type VercelProjectsSummary_ImportGithubProjectMutation = { __typename?: 'Mutation', importGithubProject: { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } };

export type VercelProjectsSummary_SetupVercelIntegrationMutationVariables = Exact<{
  input: SetupVercelIntegrationInput;
}>;


export type VercelProjectsSummary_SetupVercelIntegrationMutation = { __typename?: 'Mutation', setupVercelIntegration?: boolean | null };

export type Vercel_RetrieveVercelTokenMutationVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type Vercel_RetrieveVercelTokenMutation = { __typename?: 'Mutation', retrieveVercelToken: { __typename?: 'VercelApiToken', access_token: string, installation_id: string, user_id: string, team_id?: string | null } };

export type NewProject_ImportGithubProjectMutationVariables = Exact<{
  repo: Scalars['String']['input'];
  owner: Scalars['String']['input'];
  accountSlug: Scalars['String']['input'];
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


export type AccountProjects_AccountQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, permissions: Array<Permission>, projects: { __typename?: 'ProjectConnection', edges: Array<(
        { __typename?: 'Project', id: string }
        & { ' $fragmentRefs'?: { 'ProjectList_ProjectFragment': ProjectList_ProjectFragment } }
      )> } } | { __typename?: 'User', id: string, permissions: Array<Permission>, projects: { __typename?: 'ProjectConnection', edges: Array<(
        { __typename?: 'Project', id: string }
        & { ' $fragmentRefs'?: { 'ProjectList_ProjectFragment': ProjectList_ProjectFragment } }
      )> } } | null };

export type AccountSettings_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type AccountSettings_AccountQuery = { __typename?: 'Query', account?: (
    { __typename?: 'Team', id: string, permissions: Array<Permission>, plan?: { __typename?: 'Plan', id: string, name: string } | null }
    & { ' $fragmentRefs'?: { 'TeamMembers_TeamFragment': TeamMembers_TeamFragment;'TeamDelete_TeamFragment': TeamDelete_TeamFragment;'AccountChangeName_Account_Team_Fragment': AccountChangeName_Account_Team_Fragment;'AccountChangeSlug_Account_Team_Fragment': AccountChangeSlug_Account_Team_Fragment;'PlanCard_Account_Team_Fragment': PlanCard_Account_Team_Fragment;'AccountGitLab_Account_Team_Fragment': AccountGitLab_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, permissions: Array<Permission>, plan?: { __typename?: 'Plan', id: string, name: string } | null }
    & { ' $fragmentRefs'?: { 'AccountChangeName_Account_User_Fragment': AccountChangeName_Account_User_Fragment;'AccountChangeSlug_Account_User_Fragment': AccountChangeSlug_Account_User_Fragment;'PlanCard_Account_User_Fragment': PlanCard_Account_User_Fragment;'AccountGitLab_Account_User_Fragment': AccountGitLab_Account_User_Fragment } }
  ) | null };

export type Account_AccountQueryVariables = Exact<{
  slug: Scalars['String']['input'];
}>;


export type Account_AccountQuery = { __typename?: 'Query', account?: (
    { __typename?: 'Team', id: string, permissions: Array<Permission> }
    & { ' $fragmentRefs'?: { 'PaymentBanner_Account_Team_Fragment': PaymentBanner_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, permissions: Array<Permission> }
    & { ' $fragmentRefs'?: { 'PaymentBanner_Account_User_Fragment': PaymentBanner_Account_User_Fragment } }
  ) | null };

export type BuildDetail_BuildFragment = { __typename?: 'Build', createdAt: any, branch: string, stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', branch: string, createdAt: any } | null, pullRequest?: { __typename?: 'GithubPullRequest', merged?: boolean | null } | null } & { ' $fragmentName'?: 'BuildDetail_BuildFragment' };

export type BuildDiffState_ScreenshotDiffFragment = { __typename?: 'ScreenshotDiff', id: string, status: ScreenshotDiffStatus, url?: string | null, name: string, width?: number | null, height?: number | null, flakyDetected: boolean, group?: string | null, test?: { __typename?: 'Test', id: string, status: TestStatus, unstable: boolean, resolvedDate?: any | null } | null, baseScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null, metadata?: { __typename?: 'ScreenshotMetadata', url?: string | null, colorScheme?: ScreenshotMetadataColorScheme | null, mediaType?: ScreenshotMetadataMediaType | null, automationLibrary: { __typename?: 'ScreenshotMetadataAutomationLibrary', name: string, version: string }, browser?: { __typename?: 'ScreenshotMetadataBrowser', name: string, version: string } | null, sdk: { __typename?: 'ScreenshotMetadataSDK', name: string, version: string }, viewport?: { __typename?: 'ScreenshotMetadataViewport', width: number, height: number } | null, test?: { __typename?: 'ScreenshotMetadataTest', id?: string | null, title: string, titlePath: Array<string>, location?: { __typename?: 'ScreenshotMetadataLocation', file: string, line: number } | null } | null } | null } | null, compareScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null, playwrightTraceUrl?: string | null, metadata?: { __typename?: 'ScreenshotMetadata', url?: string | null, colorScheme?: ScreenshotMetadataColorScheme | null, mediaType?: ScreenshotMetadataMediaType | null, automationLibrary: { __typename?: 'ScreenshotMetadataAutomationLibrary', name: string, version: string }, browser?: { __typename?: 'ScreenshotMetadataBrowser', name: string, version: string } | null, sdk: { __typename?: 'ScreenshotMetadataSDK', name: string, version: string }, viewport?: { __typename?: 'ScreenshotMetadataViewport', width: number, height: number } | null, test?: { __typename?: 'ScreenshotMetadataTest', id?: string | null, title: string, titlePath: Array<string>, location?: { __typename?: 'ScreenshotMetadataLocation', file: string, line: number } | null } | null } | null } | null } & { ' $fragmentName'?: 'BuildDiffState_ScreenshotDiffFragment' };

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

export type BuildInfos_BuildFragment = { __typename?: 'Build', createdAt: any, name: string, commit: string, branch: string, stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', commit: string, branch: string } | null, pullRequest?: { __typename?: 'GithubPullRequest', id: string, url: string, number: number } | null } & { ' $fragmentName'?: 'BuildInfos_BuildFragment' };

export type BuildPage_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
  buildNumber: Scalars['Int']['input'];
}>;


export type BuildPage_ProjectQuery = { __typename?: 'Query', project?: (
    { __typename?: 'Project', id: string, account: (
      { __typename?: 'Team', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Account_Team_Fragment': OvercapacityBanner_Account_Team_Fragment;'PaymentBanner_Account_Team_Fragment': PaymentBanner_Account_Team_Fragment } }
    ) | (
      { __typename?: 'User', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Account_User_Fragment': OvercapacityBanner_Account_User_Fragment;'PaymentBanner_Account_User_Fragment': PaymentBanner_Account_User_Fragment } }
    ), build?: (
      { __typename?: 'Build', id: string, status: BuildStatus }
      & { ' $fragmentRefs'?: { 'BuildHeader_BuildFragment': BuildHeader_BuildFragment;'BuildWorkspace_BuildFragment': BuildWorkspace_BuildFragment } }
    ) | null }
    & { ' $fragmentRefs'?: { 'BuildHeader_ProjectFragment': BuildHeader_ProjectFragment;'BuildWorkspace_ProjectFragment': BuildWorkspace_ProjectFragment } }
  ) | null };

export type BuildSidebar_BuildFragment = (
  { __typename?: 'Build', stats: { __typename?: 'BuildStats', total: number } }
  & { ' $fragmentRefs'?: { 'BuildInfos_BuildFragment': BuildInfos_BuildFragment } }
) & { ' $fragmentName'?: 'BuildSidebar_BuildFragment' };

export type BuildWorkspace_BuildFragment = (
  { __typename?: 'Build', status: BuildStatus, type?: BuildType | null, stats: { __typename?: 'BuildStats', total: number, failure: number, changed: number, added: number, removed: number, unchanged: number } }
  & { ' $fragmentRefs'?: { 'BuildSidebar_BuildFragment': BuildSidebar_BuildFragment;'BuildStatusDescription_BuildFragment': BuildStatusDescription_BuildFragment;'BuildDetail_BuildFragment': BuildDetail_BuildFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_BuildFragment' };

export type BuildWorkspace_ProjectFragment = (
  { __typename?: 'Project', referenceBranch: string, slug: string, repository?: { __typename?: 'GithubRepository', id: string, url: string } | { __typename?: 'GitlabProject', id: string, url: string } | null }
  & { ' $fragmentRefs'?: { 'BuildStatusDescription_ProjectFragment': BuildStatusDescription_ProjectFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_ProjectFragment' };

type OvercapacityBanner_Account_Team_Fragment = { __typename?: 'Team', consumptionRatio?: number | null, plan?: { __typename?: 'Plan', id: string, name: string } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Account_Team_Fragment' };

type OvercapacityBanner_Account_User_Fragment = { __typename?: 'User', consumptionRatio?: number | null, plan?: { __typename?: 'Plan', id: string, name: string } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Account_User_Fragment' };

export type OvercapacityBanner_AccountFragment = OvercapacityBanner_Account_Team_Fragment | OvercapacityBanner_Account_User_Fragment;

export type BuildHeader_BuildFragment = (
  { __typename?: 'Build', name: string, status: BuildStatus, pullRequest?: (
    { __typename?: 'GithubPullRequest', id: string }
    & { ' $fragmentRefs'?: { 'PullRequestButton_PullRequestFragment': PullRequestButton_PullRequestFragment } }
  ) | null }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
) & { ' $fragmentName'?: 'BuildHeader_BuildFragment' };

export type BuildHeader_ProjectFragment = (
  { __typename?: 'Project', repository?: { __typename?: 'GithubRepository', id: string, url: string } | { __typename?: 'GitlabProject', id: string, url: string } | null }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_ProjectFragment': BuildStatusChip_ProjectFragment;'ReviewButton_ProjectFragment': ReviewButton_ProjectFragment } }
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
    { __typename?: 'Project', id: string, permissions: Array<Permission>, buildNames: Array<string>, repository?: { __typename: 'GithubRepository', id: string, url: string } | { __typename: 'GitlabProject', id: string, url: string } | null }
    & { ' $fragmentRefs'?: { 'GettingStarted_ProjectFragment': GettingStarted_ProjectFragment;'BuildStatusChip_ProjectFragment': BuildStatusChip_ProjectFragment } }
  ) | null };

export type ProjectBuilds_Project_BuildsQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
  after: Scalars['Int']['input'];
  first: Scalars['Int']['input'];
  buildName?: InputMaybe<Scalars['String']['input']>;
}>;


export type ProjectBuilds_Project_BuildsQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, builds: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number, hasNextPage: boolean }, edges: Array<(
        { __typename?: 'Build', id: string, number: number, createdAt: any, name: string, branch: string, commit: string, pullRequest?: (
          { __typename?: 'GithubPullRequest', id: string }
          & { ' $fragmentRefs'?: { 'PullRequestButton_PullRequestFragment': PullRequestButton_PullRequestFragment } }
        ) | null }
        & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
      )> } } | null };

export type GettingStarted_ProjectFragment = { __typename?: 'Project', token?: string | null } & { ' $fragmentName'?: 'GettingStarted_ProjectFragment' };

export type ProjectReference_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
}>;


export type ProjectReference_ProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, latestReferenceBuild?: { __typename?: 'Build', id: string, number: number } | null } | null };

export type ProjectSettings_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
}>;


export type ProjectSettings_ProjectQuery = { __typename?: 'Query', project?: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectBadge_ProjectFragment': ProjectBadge_ProjectFragment;'ProjectChangeName_ProjectFragment': ProjectChangeName_ProjectFragment;'ProjectToken_ProjectFragment': ProjectToken_ProjectFragment;'ProjectReferenceBranch_ProjectFragment': ProjectReferenceBranch_ProjectFragment;'ProjectStatusChecks_ProjectFragment': ProjectStatusChecks_ProjectFragment;'ProjectVisibility_ProjectFragment': ProjectVisibility_ProjectFragment;'ProjectTransfer_ProjectFragment': ProjectTransfer_ProjectFragment;'ProjectDelete_ProjectFragment': ProjectDelete_ProjectFragment;'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) | null };

export type Project_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String']['input'];
  projectName: Scalars['String']['input'];
}>;


export type Project_ProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, permissions: Array<Permission>, tests: { __typename?: 'TestConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number } }, account: (
      { __typename?: 'Team', id: string }
      & { ' $fragmentRefs'?: { 'PaymentBanner_Account_Team_Fragment': PaymentBanner_Account_Team_Fragment } }
    ) | (
      { __typename?: 'User', id: string }
      & { ' $fragmentRefs'?: { 'PaymentBanner_Account_User_Fragment': PaymentBanner_Account_User_Fragment } }
    ) } | null };

export const AccountChangeName_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeName_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<AccountChangeName_AccountFragment, unknown>;
export const AccountChangeSlug_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeSlug_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<AccountChangeSlug_AccountFragment, unknown>;
export const AccountGitLab_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountGitLab_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}}]}}]} as unknown as DocumentNode<AccountGitLab_AccountFragment, unknown>;
export const AccountAvatarFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<AccountAvatarFragmentFragment, unknown>;
export const AccountPlanChip_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountPlanChip_AccountFragment, unknown>;
export const AccountItem_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountItem_AccountFragment, unknown>;
export const AccountBreadcrumbMenu_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<AccountBreadcrumbMenu_AccountFragment, unknown>;
export const GithubInstallationsSelect_GhApiInstallationFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GhApiInstallation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<GithubInstallationsSelect_GhApiInstallationFragment, unknown>;
export const GitlabNamespacesSelect_GlApiNamespaceFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitlabNamespacesSelect_GlApiNamespace"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GlApiNamespace"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}}]}}]} as unknown as DocumentNode<GitlabNamespacesSelect_GlApiNamespaceFragment, unknown>;
export const PaymentBanner_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}}]} as unknown as DocumentNode<PaymentBanner_AccountFragment, unknown>;
export const PlanCard_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanCard_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndDate"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"trialStatus"}},{"kind":"Field","name":{"kind":"Name","value":"hasForcedPlan"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"paymentProvider"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotsLimitPerMonth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"currentMonthUsedScreenshots"}}]}}]}}]}}]} as unknown as DocumentNode<PlanCard_AccountFragment, unknown>;
export const ProjectBadge_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectBadge_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]} as unknown as DocumentNode<ProjectBadge_ProjectFragment, unknown>;
export const ProjectChangeName_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectChangeName_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectChangeName_ProjectFragment, unknown>;
export const ProjectDelete_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDelete_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectDelete_ProjectFragment, unknown>;
export const ProjectGitRepository_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_ProjectFragment, unknown>;
export const ProjectReferenceBranch_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectReferenceBranch_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}}]} as unknown as DocumentNode<ProjectReferenceBranch_ProjectFragment, unknown>;
export const ProjectStatusChecks_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectStatusChecks_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"summaryCheck"}}]}}]} as unknown as DocumentNode<ProjectStatusChecks_ProjectFragment, unknown>;
export const ProjectToken_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectToken_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]} as unknown as DocumentNode<ProjectToken_ProjectFragment, unknown>;
export const ProjectTransfer_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ProjectTransfer_AccountFragment, unknown>;
export const ProjectTransfer_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_ProjectFragment, unknown>;
export const ProjectVisibility_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVisibility_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}}]} as unknown as DocumentNode<ProjectVisibility_ProjectFragment, unknown>;
export const ProjectList_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectList_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"latestBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ProjectList_ProjectFragment, unknown>;
export const TeamDelete_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamDelete_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}}]}}]} as unknown as DocumentNode<TeamDelete_TeamFragment, unknown>;
export const RemoveFromTeamDialog_UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<RemoveFromTeamDialog_UserFragment, unknown>;
export const LevelSelect_TeamMemberFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<LevelSelect_TeamMemberFragment, unknown>;
export const TeamMembers_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamMembers_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"inviteLink"}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelSelect_TeamMember"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<TeamMembers_TeamFragment, unknown>;
export const ChooseTeam_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChooseTeam_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ChooseTeam_TeamFragment, unknown>;
export const BuildDiffState_ScreenshotDiffFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDiffState_ScreenshotDiff"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ScreenshotDiff"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"flakyDetected"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"unstable"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedDate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"playwrightTraceUrl"}}]}}]}}]} as unknown as DocumentNode<BuildDiffState_ScreenshotDiffFragment, unknown>;
export const BuildInfos_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}}]}}]} as unknown as DocumentNode<BuildInfos_BuildFragment, unknown>;
export const BuildSidebar_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}}]}}]} as unknown as DocumentNode<BuildSidebar_BuildFragment, unknown>;
export const BuildStatusDescription_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<BuildStatusDescription_BuildFragment, unknown>;
export const BuildDetail_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"merged"}}]}}]}}]} as unknown as DocumentNode<BuildDetail_BuildFragment, unknown>;
export const BuildWorkspace_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"merged"}}]}}]}}]} as unknown as DocumentNode<BuildWorkspace_BuildFragment, unknown>;
export const BuildStatusDescription_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildStatusDescription_ProjectFragment, unknown>;
export const BuildWorkspace_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}},{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildWorkspace_ProjectFragment, unknown>;
export const OvercapacityBanner_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}}]} as unknown as DocumentNode<OvercapacityBanner_AccountFragment, unknown>;
export const PullRequestStatusIcon_PullRequestFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]} as unknown as DocumentNode<PullRequestStatusIcon_PullRequestFragment, unknown>;
export const PullRequestInfo_PullRequestFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]} as unknown as DocumentNode<PullRequestInfo_PullRequestFragment, unknown>;
export const PullRequestButton_PullRequestFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<PullRequestButton_PullRequestFragment, unknown>;
export const BuildStatusChip_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<BuildStatusChip_BuildFragment, unknown>;
export const BuildHeader_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestButton_PullRequest"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<BuildHeader_BuildFragment, unknown>;
export const BuildStatusChip_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildStatusChip_ProjectFragment, unknown>;
export const ReviewButton_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ReviewButton_ProjectFragment, unknown>;
export const BuildHeader_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewButton_Project"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<BuildHeader_ProjectFragment, unknown>;
export const GettingStarted_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GettingStarted_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]} as unknown as DocumentNode<GettingStarted_ProjectFragment, unknown>;
export const AccountChangeName_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountChangeName_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountChangeName_UpdateAccountMutation, AccountChangeName_UpdateAccountMutationVariables>;
export const AccountChangeSlug_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountChangeSlug_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<AccountChangeSlug_UpdateAccountMutation, AccountChangeSlug_UpdateAccountMutationVariables>;
export const AccountGitLab_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountGitLab_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gitlabAccessToken"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"gitlabAccessToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gitlabAccessToken"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}}]}}]}}]} as unknown as DocumentNode<AccountGitLab_UpdateAccountMutation, AccountGitLab_UpdateAccountMutationVariables>;
export const AccountBreadcrumb_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountBreadcrumb_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountBreadcrumb_AccountQuery, AccountBreadcrumb_AccountQueryVariables>;
export const AccountBreadcrumbMenu_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountBreadcrumbMenu_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]} as unknown as DocumentNode<AccountBreadcrumbMenu_MeQuery, AccountBreadcrumbMenu_MeQueryVariables>;
export const ProjectBreadcrumbMenu_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBreadcrumbMenu_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ProjectBreadcrumbMenu_AccountQuery, ProjectBreadcrumbMenu_AccountQueryVariables>;
export const GithubRepositoryList_GhApiInstallationRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GithubRepositoryList_ghApiInstallationRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"installationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reposPerPage"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ghApiInstallationRepositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"installationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"installationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"reposPerPage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reposPerPage"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"owner_login"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]} as unknown as DocumentNode<GithubRepositoryList_GhApiInstallationRepositoriesQuery, GithubRepositoryList_GhApiInstallationRepositoriesQueryVariables>;
export const GitlabProjectList_GlApiProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GitlabProjectList_glApiProjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"allProjects"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accessToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"search"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"glApiProjects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"groupId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupId"}}},{"kind":"Argument","name":{"kind":"Name","value":"allProjects"},"value":{"kind":"Variable","name":{"kind":"Name","value":"allProjects"}}},{"kind":"Argument","name":{"kind":"Name","value":"accessToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accessToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"search"},"value":{"kind":"Variable","name":{"kind":"Name","value":"search"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"last_activity_at"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]} as unknown as DocumentNode<GitlabProjectList_GlApiProjectsQuery, GitlabProjectList_GlApiProjectsQueryVariables>;
export const NavUserControl_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"NavUserControl_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<NavUserControl_AccountQuery, NavUserControl_AccountQueryVariables>;
export const PaymentBanner_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PaymentBanner_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"hasSubscribedToTrial"}}]}}]}}]} as unknown as DocumentNode<PaymentBanner_MeQuery, PaymentBanner_MeQueryVariables>;
export const TerminateTrialDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"terminateTrial"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"terminateTrial"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}}]}}]} as unknown as DocumentNode<TerminateTrialMutation, TerminateTrialMutationVariables>;
export const ProjectChangeName_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectChangeName_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProjectChangeName_UpdateProjectMutation, ProjectChangeName_UpdateProjectMutationVariables>;
export const ConnectRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ConnectRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}},{"kind":"Field","name":{"kind":"Name","value":"glNamespaces"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GitlabNamespacesSelect_GlApiNamespace"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghInstallations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GitlabNamespacesSelect_GlApiNamespace"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GlApiNamespace"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GithubInstallationsSelect_GhApiInstallation"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GhApiInstallation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ConnectRepositoryQuery, ConnectRepositoryQueryVariables>;
export const DeleteProjectMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProjectMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}]}}]} as unknown as DocumentNode<DeleteProjectMutationMutation, DeleteProjectMutationMutationVariables>;
export const ProjectGitRepository_LinkGithubRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_linkGithubRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkGithubRepository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_LinkGithubRepositoryMutation, ProjectGitRepository_LinkGithubRepositoryMutationVariables>;
export const ProjectGitRepository_UnlinkGithubRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_unlinkGithubRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkGithubRepository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_UnlinkGithubRepositoryMutation, ProjectGitRepository_UnlinkGithubRepositoryMutationVariables>;
export const ProjectGitRepository_LinkGitlabProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_linkGitlabProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkGitlabProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"gitlabProjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_LinkGitlabProjectMutation, ProjectGitRepository_LinkGitlabProjectMutationVariables>;
export const ProjectGitRepository_UnlinkGitlabProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_unlinkGitlabProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkGitlabProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectGitRepository_UnlinkGitlabProjectMutation, ProjectGitRepository_UnlinkGitlabProjectMutationVariables>;
export const ProjectGitRepository_UpdateEnablePrCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_updateEnablePrComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"enable"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProjectPrComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"enable"},"value":{"kind":"Variable","name":{"kind":"Name","value":"enable"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]}}]} as unknown as DocumentNode<ProjectGitRepository_UpdateEnablePrCommentMutation, ProjectGitRepository_UpdateEnablePrCommentMutationVariables>;
export const ProjectReferenceBranch_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectReferenceBranch_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baselineBranch"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"baselineBranch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baselineBranch"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}}]}}]}}]} as unknown as DocumentNode<ProjectReferenceBranch_UpdateProjectMutation, ProjectReferenceBranch_UpdateProjectMutationVariables>;
export const ProjectStatusChecks_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectStatusChecks_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"summaryCheck"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"SummaryCheck"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"summaryCheck"},"value":{"kind":"Variable","name":{"kind":"Name","value":"summaryCheck"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"summaryCheck"}}]}}]}}]} as unknown as DocumentNode<ProjectStatusChecks_UpdateProjectMutation, ProjectStatusChecks_UpdateProjectMutationVariables>;
export const TransferProject_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TransferProject_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<TransferProject_MeQuery, TransferProject_MeQueryVariables>;
export const ProjectTransfer_ReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectTransfer_Review"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actualAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalScreenshots"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"actualAccount"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actualAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Account"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"targetAccount"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Account"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_ReviewQuery, ProjectTransfer_ReviewQueryVariables>;
export const ProjectTransfer_TransferProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectTransfer_TransferProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transferProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"targetAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_TransferProjectMutation, ProjectTransfer_TransferProjectMutationVariables>;
export const ProjectVisibility_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectVisibility_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"private"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"private"},"value":{"kind":"Variable","name":{"kind":"Name","value":"private"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}}]} as unknown as DocumentNode<ProjectVisibility_UpdateProjectMutation, ProjectVisibility_UpdateProjectMutationVariables>;
export const SetValidationStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"setValidationStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setValidationStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"buildId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}}},{"kind":"Argument","name":{"kind":"Name","value":"validationStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SetValidationStatusMutation, SetValidationStatusMutationVariables>;
export const DeleteTeamMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTeamMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}]}}]}]}}]} as unknown as DocumentNode<DeleteTeamMutationMutation, DeleteTeamMutationMutationVariables>;
export const TeamMembers_TeamMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeamMembers_teamMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"team"},"name":{"kind":"Name","value":"teamById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelSelect_TeamMember"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<TeamMembers_TeamMembersQuery, TeamMembers_TeamMembersQueryVariables>;
export const TeamMembers_LeaveTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TeamMembers_leaveTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}}]}}]}]}}]} as unknown as DocumentNode<TeamMembers_LeaveTeamMutation, TeamMembers_LeaveTeamMutationVariables>;
export const TeamMembers_RemoveUserFromTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TeamMembers_removeUserFromTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeUserFromTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"userAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamMemberId"}}]}}]}}]} as unknown as DocumentNode<TeamMembers_RemoveUserFromTeamMutation, TeamMembers_RemoveUserFromTeamMutationVariables>;
export const SetTeamMemberLevelMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetTeamMemberLevelMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TeamUserLevel"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setTeamMemberLevel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"teamAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"userAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}}]}}]}}]} as unknown as DocumentNode<SetTeamMemberLevelMutationMutation, SetTeamMemberLevelMutationMutationVariables>;
export const NewTeam_CreateTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NewTeam_createTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"redirectUrl"}}]}}]}}]} as unknown as DocumentNode<NewTeam_CreateTeamMutation, NewTeam_CreateTeamMutationVariables>;
export const TeamNewForm_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TeamNewForm_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"hasSubscribedToTrial"}}]}}]}}]} as unknown as DocumentNode<TeamNewForm_MeQuery, TeamNewForm_MeQueryVariables>;
export const UpgradeDialog_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UpgradeDialog_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"hasSubscribedToTrial"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"hasPaidPlan"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<UpgradeDialog_MeQuery, UpgradeDialog_MeQueryVariables>;
export const Vercel_VercelApiTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Vercel_vercelApiTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accessToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"vercelApiTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"accessToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accessToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<Vercel_VercelApiTeamQuery, Vercel_VercelApiTeamQueryVariables>;
export const Vercel_CreateTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Vercel_createTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"team"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<Vercel_CreateTeamMutation, Vercel_CreateTeamMutationVariables>;
export const FromTeam_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FromTeam_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChooseTeam_Team"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChooseTeam_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<FromTeam_MeQuery, FromTeam_MeQueryVariables>;
export const VercelProjectsSummary_Me_VercelApiProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"VercelProjectsSummary_me_vercelApiProjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accessToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghInstallations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"vercelApiProjects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"teamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"accessToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accessToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"100"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}]},{"kind":"Field","name":{"kind":"Name","value":"linkedProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"link"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VercelApiProjectLinkGithub"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"org"}},{"kind":"Field","name":{"kind":"Name","value":"repo"}},{"kind":"Field","name":{"kind":"Name","value":"repoId"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<VercelProjectsSummary_Me_VercelApiProjectsQuery, VercelProjectsSummary_Me_VercelApiProjectsQueryVariables>;
export const VercelProjectsSummary_ImportGithubProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VercelProjectsSummary_importGithubProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importGithubProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<VercelProjectsSummary_ImportGithubProjectMutation, VercelProjectsSummary_ImportGithubProjectMutationVariables>;
export const VercelProjectsSummary_SetupVercelIntegrationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VercelProjectsSummary_setupVercelIntegration"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetupVercelIntegrationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setupVercelIntegration"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<VercelProjectsSummary_SetupVercelIntegrationMutation, VercelProjectsSummary_SetupVercelIntegrationMutationVariables>;
export const Vercel_RetrieveVercelTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Vercel_retrieveVercelToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"retrieveVercelToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"access_token"}},{"kind":"Field","name":{"kind":"Name","value":"installation_id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"team_id"}}]}}]}}]} as unknown as DocumentNode<Vercel_RetrieveVercelTokenMutation, Vercel_RetrieveVercelTokenMutationVariables>;
export const NewProject_ImportGithubProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NewProject_importGithubProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importGithubProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<NewProject_ImportGithubProjectMutation, NewProject_ImportGithubProjectMutationVariables>;
export const NewProject_ImportGitlabProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NewProject_importGitlabProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"importGitlabProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"gitlabProjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"gitlabProjectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<NewProject_ImportGitlabProjectMutation, NewProject_ImportGitlabProjectMutationVariables>;
export const AccountProjects_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountProjects_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectList_Project"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectList_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"latestBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AccountProjects_AccountQuery, AccountProjects_AccountQueryVariables>;
export const AccountSettings_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountSettings_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamMembers_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamDelete_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountChangeName_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountChangeSlug_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PlanCard_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountGitLab_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamMembers_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"inviteLink"}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelSelect_TeamMember"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamDelete_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeName_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeSlug_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanCard_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndDate"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"trialStatus"}},{"kind":"Field","name":{"kind":"Name","value":"hasForcedPlan"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"paymentProvider"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotsLimitPerMonth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"currentMonthUsedScreenshots"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountGitLab_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"gitlabAccessToken"}}]}}]} as unknown as DocumentNode<AccountSettings_AccountQuery, AccountSettings_AccountQueryVariables>;
export const Account_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Account_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}}]} as unknown as DocumentNode<Account_AccountQuery, Account_AccountQueryVariables>;
export const BuildDiffState_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildDiffState_Project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotDiffs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDiffState_ScreenshotDiff"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDiffState_ScreenshotDiff"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ScreenshotDiff"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"flakyDetected"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"unstable"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedDate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"metadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"colorScheme"}},{"kind":"Field","name":{"kind":"Name","value":"mediaType"}},{"kind":"Field","name":{"kind":"Name","value":"automationLibrary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"browser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sdk"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewport"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"titlePath"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"file"}},{"kind":"Field","name":{"kind":"Name","value":"line"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"playwrightTraceUrl"}}]}}]}}]} as unknown as DocumentNode<BuildDiffState_ProjectQuery, BuildDiffState_ProjectQueryVariables>;
export const BuildPage_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildPage_Project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Project"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"OvercapacityBanner_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Build"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"merged"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewButton_Project"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}},{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestButton_PullRequest"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}}]}}]}}]} as unknown as DocumentNode<BuildPage_ProjectQuery, BuildPage_ProjectQueryVariables>;
export const Invite_InvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Invite_invitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<Invite_InvitationQuery, Invite_InvitationQueryVariables>;
export const Invite_AcceptInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Invite_acceptInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<Invite_AcceptInvitationMutation, Invite_AcceptInvitationMutationVariables>;
export const ProjectBuilds_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBuilds_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"buildNames"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GettingStarted_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GettingStarted_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}}]} as unknown as DocumentNode<ProjectBuilds_ProjectQuery, ProjectBuilds_ProjectQueryVariables>;
export const ProjectBuilds_Project_BuildsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBuilds_project_Builds"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}},{"kind":"Argument","name":{"kind":"Name","value":"buildName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"buildName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestButton_PullRequest"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"draft"}},{"kind":"Field","name":{"kind":"Name","value":"merged"}},{"kind":"Field","name":{"kind":"Name","value":"mergedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GithubPullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PullRequestButton_PullRequest"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PullRequest"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestStatusIcon_PullRequest"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PullRequestInfo_PullRequest"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<ProjectBuilds_Project_BuildsQuery, ProjectBuilds_Project_BuildsQueryVariables>;
export const ProjectReference_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectReference_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"latestReferenceBuild"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectReference_ProjectQuery, ProjectReference_ProjectQueryVariables>;
export const ProjectSettings_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectSettings_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectBadge_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectChangeName_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectToken_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectReferenceBranch_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectStatusChecks_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectVisibility_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectDelete_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectBadge_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectChangeName_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectToken_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectReferenceBranch_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectStatusChecks_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"summaryCheck"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVisibility_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDelete_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}},{"kind":"Field","name":{"kind":"Name","value":"prCommentEnabled"}}]}}]} as unknown as DocumentNode<ProjectSettings_ProjectQuery, ProjectSettings_ProjectQueryVariables>;
export const Project_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Project_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"tests"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"0"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}}]} as unknown as DocumentNode<Project_ProjectQuery, Project_ProjectQueryVariables>;