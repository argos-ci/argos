/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Date: any;
  DateTime: any;
  Time: any;
};

export type Account = {
  avatar: AccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  ghAccount?: Maybe<GithubAccount>;
  hasForcedPlan: Scalars['Boolean'];
  hasPaidPlan: Scalars['Boolean'];
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  paymentProvider?: Maybe<PurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']>;
  periodEndDate?: Maybe<Scalars['DateTime']>;
  periodStartDate?: Maybe<Scalars['DateTime']>;
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  purchase?: Maybe<Purchase>;
  purchaseStatus?: Maybe<PurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  slug: Scalars['String'];
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  trialStatus?: Maybe<TrialStatus>;
  vercelConfiguration?: Maybe<VercelConfiguration>;
};


export type AccountProjectsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type AccountAvatar = {
  __typename?: 'AccountAvatar';
  color: Scalars['String'];
  initial: Scalars['String'];
  url?: Maybe<Scalars['String']>;
};


export type AccountAvatarUrlArgs = {
  size: Scalars['Int'];
};

export type Build = Node & {
  __typename?: 'Build';
  /** The screenshot bucket of the baselineBranch */
  baseScreenshotBucket?: Maybe<ScreenshotBucket>;
  /** Received batch count  */
  batchCount?: Maybe<Scalars['Int']>;
  /** The screenshot bucket of the build commit */
  compareScreenshotBucket: ScreenshotBucket;
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  /** Build name */
  name: Scalars['String'];
  /** Continuous number. It is incremented after each build */
  number: Scalars['Int'];
  /** Pull request number */
  prNumber?: Maybe<Scalars['Int']>;
  /** The screenshot diffs between the base screenshot bucket of the compare screenshot bucket */
  screenshotDiffs: ScreenshotDiffConnection;
  /** Build stats */
  stats: BuildStats;
  /** Review status, conclusion or job status */
  status: BuildStatus;
  /** Expected batch count */
  totalBatch?: Maybe<Scalars['Int']>;
  /** Build type */
  type?: Maybe<BuildType>;
  updatedAt: Scalars['DateTime'];
};


export type BuildScreenshotDiffsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type BuildConnection = Connection & {
  __typename?: 'BuildConnection';
  edges: Array<Build>;
  pageInfo: PageInfo;
};

export type BuildStats = {
  __typename?: 'BuildStats';
  added: Scalars['Int'];
  changed: Scalars['Int'];
  failure: Scalars['Int'];
  removed: Scalars['Int'];
  total: Scalars['Int'];
  unchanged: Scalars['Int'];
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

export type CreateProjectInput = {
  accountSlug: Scalars['String'];
  owner: Scalars['String'];
  repo: Scalars['String'];
};

export type CreateTeamInput = {
  name: Scalars['String'];
};

export type CreateTeamResult = {
  __typename?: 'CreateTeamResult';
  redirectUrl: Scalars['String'];
  team: Team;
};

export type DeleteTeamInput = {
  accountId: Scalars['ID'];
};

export type GhApiInstallation = Node & {
  __typename?: 'GhApiInstallation';
  account: GhApiInstallationAccount;
  id: Scalars['ID'];
};

export type GhApiInstallationAccount = Node & {
  __typename?: 'GhApiInstallationAccount';
  id: Scalars['ID'];
  login: Scalars['String'];
  name?: Maybe<Scalars['String']>;
};

export type GhApiInstallationConnection = Connection & {
  __typename?: 'GhApiInstallationConnection';
  edges: Array<GhApiInstallation>;
  pageInfo: PageInfo;
};

export type GhApiRepository = Node & {
  __typename?: 'GhApiRepository';
  id: Scalars['ID'];
  name: Scalars['String'];
  owner_login: Scalars['String'];
  updated_at: Scalars['String'];
};

export type GhApiRepositoryConnection = Connection & {
  __typename?: 'GhApiRepositoryConnection';
  edges: Array<GhApiRepository>;
  pageInfo: PageInfo;
};

export type GithubAccount = Node & {
  __typename?: 'GithubAccount';
  id: Scalars['ID'];
  login: Scalars['String'];
};

export type GithubRepository = Node & {
  __typename?: 'GithubRepository';
  defaultBranch: Scalars['String'];
  fullName: Scalars['String'];
  id: Scalars['ID'];
  private: Scalars['Boolean'];
};

export enum JobStatus {
  Aborted = 'aborted',
  Complete = 'complete',
  Error = 'error',
  Pending = 'pending',
  Progress = 'progress'
}

export type LeaveTeamInput = {
  teamAccountId: Scalars['ID'];
};

export type LinkRepositoryInput = {
  owner: Scalars['String'];
  projectId: Scalars['ID'];
  repo: Scalars['String'];
};

export type LinkVercelProjectInput = {
  configurationId: Scalars['ID'];
  projectId: Scalars['ID'];
  vercelProjectId: Scalars['ID'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Accept an invitation to join a team */
  acceptInvitation: Team;
  /** Create a Project */
  createProject: Project;
  /** Create a team */
  createTeam: CreateTeamResult;
  /** Delete Project */
  deleteProject: Scalars['Boolean'];
  /** Delete team and all its projects */
  deleteTeam: Scalars['Boolean'];
  /** Leave a team */
  leaveTeam: Scalars['Boolean'];
  /** Link Repository */
  linkRepository: Project;
  /** Link Vercel project */
  linkVercelProject: Project;
  /** Mute or unmute tests */
  muteTests: MuteUpdateTest;
  ping: Scalars['Boolean'];
  /** Remove a user from a team */
  removeUserFromTeam: RemoveUserFromTeamPayload;
  /** Retrieve a Vercel API token from a code */
  retrieveVercelToken: VercelApiToken;
  /** Set member level */
  setTeamMemberLevel: TeamMember;
  /** Change the validationStatus on a build */
  setValidationStatus: Build;
  /** Finish the Vercel integration setup */
  setupVercelIntegration?: Maybe<Scalars['Boolean']>;
  /** Terminate trial early */
  terminateTrial: Account;
  /** Transfer Project to another account */
  transferProject: Project;
  /** Unlink Repository */
  unlinkRepository: Project;
  /** Unlink Vercel project */
  unlinkVercelProject: Project;
  /** Update Account */
  updateAccount: Account;
  /** Update Project */
  updateProject: Project;
  /** Update test statuses */
  updateTestStatuses: UpdatedTestStatuses;
};


export type MutationAcceptInvitationArgs = {
  token: Scalars['String'];
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreateTeamArgs = {
  input: CreateTeamInput;
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID'];
};


export type MutationDeleteTeamArgs = {
  input: DeleteTeamInput;
};


export type MutationLeaveTeamArgs = {
  input: LeaveTeamInput;
};


export type MutationLinkRepositoryArgs = {
  input: LinkRepositoryInput;
};


export type MutationLinkVercelProjectArgs = {
  input: LinkVercelProjectInput;
};


export type MutationMuteTestsArgs = {
  ids: Array<Scalars['String']>;
  muteUntil?: InputMaybe<Scalars['String']>;
  muted: Scalars['Boolean'];
};


export type MutationRemoveUserFromTeamArgs = {
  input: RemoveUserFromTeamInput;
};


export type MutationRetrieveVercelTokenArgs = {
  code: Scalars['String'];
};


export type MutationSetTeamMemberLevelArgs = {
  input: SetTeamMemberLevelInput;
};


export type MutationSetValidationStatusArgs = {
  buildId: Scalars['ID'];
  validationStatus: ValidationStatus;
};


export type MutationSetupVercelIntegrationArgs = {
  input: SetupVercelIntegrationInput;
};


export type MutationTerminateTrialArgs = {
  accountId: Scalars['ID'];
};


export type MutationTransferProjectArgs = {
  input: TransferProjectInput;
};


export type MutationUnlinkRepositoryArgs = {
  input: UnlinkRepositoryInput;
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


export type MutationUpdateTestStatusesArgs = {
  ids: Array<Scalars['String']>;
  status: TestStatus;
};

export type MuteUpdateTest = {
  __typename?: 'MuteUpdateTest';
  ids: Array<Scalars['String']>;
  mute: Scalars['Boolean'];
  muteUntil?: Maybe<Scalars['String']>;
};

export type Node = {
  id: Scalars['ID'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean'];
  totalCount: Scalars['Int'];
};

export enum Permission {
  Read = 'read',
  Write = 'write'
}

export type Plan = Node & {
  __typename?: 'Plan';
  id: Scalars['ID'];
  name: Scalars['String'];
  screenshotsLimitPerMonth: Scalars['Int'];
};

export type Project = Node & {
  __typename?: 'Project';
  /** Owner of the repository */
  account: Account;
  /** Override branch name */
  baselineBranch?: Maybe<Scalars['String']>;
  /** A single build linked to the repository */
  build?: Maybe<Build>;
  /** Builds associated to the repository */
  builds: BuildConnection;
  /** Current month used screenshots */
  currentMonthUsedScreenshots: Scalars['Int'];
  /** Repositories associated to the project */
  ghRepository?: Maybe<GithubRepository>;
  id: Scalars['ID'];
  name: Scalars['String'];
  /** Determine if the current user has write access to the project */
  permissions: Array<Permission>;
  /** Override repository's Github privacy */
  private?: Maybe<Scalars['Boolean']>;
  /** Check if the project is public or not */
  public: Scalars['Boolean'];
  /** Reference branch */
  referenceBranch?: Maybe<Scalars['String']>;
  /** Tests associated to the repository */
  tests: TestConnection;
  token?: Maybe<Scalars['String']>;
  /** Total screenshots used */
  totalScreenshots: Scalars['Int'];
  /** Vercel project */
  vercelProject?: Maybe<VercelProject>;
};


export type ProjectBuildArgs = {
  number: Scalars['Int'];
};


export type ProjectBuildsArgs = {
  after?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
};


export type ProjectTestsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type ProjectConnection = Connection & {
  __typename?: 'ProjectConnection';
  edges: Array<Project>;
  pageInfo: PageInfo;
};

export type Purchase = Node & {
  __typename?: 'Purchase';
  id: Scalars['ID'];
  paymentMethodFilled: Scalars['Boolean'];
  source: PurchaseSource;
  trialDaysRemaining?: Maybe<Scalars['Int']>;
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
  /** Ongoing trial */
  Trialing = 'trialing',
  /** Payment due */
  Unpaid = 'unpaid'
}

export type Query = {
  __typename?: 'Query';
  /** Get Account by slug */
  account?: Maybe<Account>;
  /** Get Account by id */
  accountById?: Maybe<Account>;
  ghApiInstallationRepositories: GhApiRepositoryConnection;
  invitation?: Maybe<Team>;
  /** Get the authenticated user */
  me?: Maybe<User>;
  ping: Scalars['Boolean'];
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
  slug: Scalars['String'];
};


export type QueryAccountByIdArgs = {
  id: Scalars['ID'];
};


export type QueryGhApiInstallationRepositoriesArgs = {
  installationId: Scalars['ID'];
  page: Scalars['Int'];
};


export type QueryInvitationArgs = {
  token: Scalars['String'];
};


export type QueryProjectArgs = {
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
};


export type QueryProjectByIdArgs = {
  id: Scalars['ID'];
};


export type QueryTeamByIdArgs = {
  id: Scalars['ID'];
};


export type QueryVercelApiProjectsArgs = {
  accessToken: Scalars['String'];
  limit?: InputMaybe<Scalars['Int']>;
  teamId?: InputMaybe<Scalars['ID']>;
};


export type QueryVercelApiTeamArgs = {
  accessToken: Scalars['String'];
  id: Scalars['ID'];
};

export type RemoveUserFromTeamInput = {
  teamAccountId: Scalars['ID'];
  userAccountId: Scalars['ID'];
};

export type RemoveUserFromTeamPayload = {
  __typename?: 'RemoveUserFromTeamPayload';
  teamMemberId: Scalars['ID'];
};

export type Screenshot = Node & {
  __typename?: 'Screenshot';
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  url: Scalars['String'];
  width?: Maybe<Scalars['Int']>;
};

export type ScreenshotBucket = Node & {
  __typename?: 'ScreenshotBucket';
  branch: Scalars['String'];
  commit: Scalars['String'];
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
};

export type ScreenshotDiff = Node & {
  __typename?: 'ScreenshotDiff';
  baseScreenshot?: Maybe<Screenshot>;
  compareScreenshot?: Maybe<Screenshot>;
  createdAt: Scalars['DateTime'];
  flakyDetected: Scalars['Boolean'];
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  status: ScreenshotDiffStatus;
  test?: Maybe<Test>;
  url?: Maybe<Scalars['String']>;
  validationStatus?: Maybe<Scalars['String']>;
  width?: Maybe<Scalars['Int']>;
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

export type SetTeamMemberLevelInput = {
  level: TeamUserLevel;
  teamAccountId: Scalars['ID'];
  userAccountId: Scalars['ID'];
};

export type SetupVercelIntegrationInput = {
  accountId: Scalars['ID'];
  projects: Array<SetupVercelIntegrationProjectInput>;
  vercelAccessToken: Scalars['String'];
  vercelConfigurationId: Scalars['ID'];
  vercelTeamId?: InputMaybe<Scalars['ID']>;
};

export type SetupVercelIntegrationProjectInput = {
  projectId: Scalars['ID'];
  vercelProjectId: Scalars['ID'];
};

export type Team = Account & Node & {
  __typename?: 'Team';
  avatar: AccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  ghAccount?: Maybe<GithubAccount>;
  hasForcedPlan: Scalars['Boolean'];
  hasPaidPlan: Scalars['Boolean'];
  id: Scalars['ID'];
  inviteLink: Scalars['String'];
  me: TeamMember;
  members: TeamMemberConnection;
  name?: Maybe<Scalars['String']>;
  oldPaidPurchase?: Maybe<Purchase>;
  paymentProvider?: Maybe<PurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']>;
  periodEndDate?: Maybe<Scalars['DateTime']>;
  periodStartDate?: Maybe<Scalars['DateTime']>;
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  purchase?: Maybe<Purchase>;
  purchaseStatus?: Maybe<PurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  slug: Scalars['String'];
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  trialStatus?: Maybe<TrialStatus>;
  vercelConfiguration?: Maybe<VercelConfiguration>;
};


export type TeamMembersArgs = {
  after?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
};


export type TeamProjectsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type TeamMember = Node & {
  __typename?: 'TeamMember';
  id: Scalars['ID'];
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
  buildName: Scalars['String'];
  dailyChanges: Array<DailyCount>;
  id: Scalars['ID'];
  lastSeen?: Maybe<Scalars['DateTime']>;
  mute: Scalars['Boolean'];
  muteUntil?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  resolvedDate?: Maybe<Scalars['DateTime']>;
  screenshot?: Maybe<Screenshot>;
  stabilityScore?: Maybe<Scalars['Int']>;
  status: TestStatus;
  totalBuilds: Scalars['Int'];
  unstable: Scalars['Boolean'];
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
  id: Scalars['ID'];
  name: Scalars['String'];
  targetAccountId: Scalars['ID'];
};

export enum TrialStatus {
  /** Trial is active */
  Active = 'active',
  /** Subscription ended when trial did */
  Expired = 'expired'
}

export type UnlinkRepositoryInput = {
  projectId: Scalars['ID'];
};

export type UnlinkVercelProjectInput = {
  projectId: Scalars['ID'];
};

export type UpdateAccountInput = {
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  slug?: InputMaybe<Scalars['String']>;
};

export type UpdateProjectInput = {
  baselineBranch?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  private?: InputMaybe<Scalars['Boolean']>;
};

export type UpdatedTestStatuses = {
  __typename?: 'UpdatedTestStatuses';
  ids: Array<Scalars['String']>;
  status: TestStatus;
};

export type User = Account & Node & {
  __typename?: 'User';
  avatar: AccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  ghAccount?: Maybe<GithubAccount>;
  ghInstallations: GhApiInstallationConnection;
  hasForcedPlan: Scalars['Boolean'];
  hasPaidPlan: Scalars['Boolean'];
  hasSubscribedToTrial: Scalars['Boolean'];
  id: Scalars['ID'];
  lastPurchase?: Maybe<Purchase>;
  name?: Maybe<Scalars['String']>;
  oldPaidPurchase?: Maybe<Purchase>;
  paymentProvider?: Maybe<PurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']>;
  periodEndDate?: Maybe<Scalars['DateTime']>;
  periodStartDate?: Maybe<Scalars['DateTime']>;
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  projects: ProjectConnection;
  purchase?: Maybe<Purchase>;
  purchaseStatus?: Maybe<PurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  slug: Scalars['String'];
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  teams: Array<Team>;
  trialStatus?: Maybe<TrialStatus>;
  vercelConfiguration?: Maybe<VercelConfiguration>;
};


export type UserProjectsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
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
  count: Scalars['Int'];
  next?: Maybe<Scalars['ID']>;
  prev?: Maybe<Scalars['ID']>;
};

export type VercelApiProject = {
  __typename?: 'VercelApiProject';
  id: Scalars['ID'];
  link?: Maybe<VercelApiProjectLink>;
  linkedProject?: Maybe<Project>;
  name: Scalars['String'];
  project?: Maybe<Project>;
  status: VercelApiProjectStatus;
};


export type VercelApiProjectStatusArgs = {
  accountId: Scalars['ID'];
};

export type VercelApiProjectConnection = {
  __typename?: 'VercelApiProjectConnection';
  pagination: VercelApiPagination;
  projects: Array<VercelApiProject>;
};

export type VercelApiProjectLink = {
  type: Scalars['String'];
};

export type VercelApiProjectLinkGithub = VercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkGithub';
  org: Scalars['String'];
  repo: Scalars['String'];
  repoId: Scalars['Int'];
  type: Scalars['String'];
};

export type VercelApiProjectLinkOther = VercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkOther';
  type: Scalars['String'];
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
  id: Scalars['ID'];
  name: Scalars['String'];
  slug: Scalars['String'];
};

export type VercelApiToken = {
  __typename?: 'VercelApiToken';
  access_token: Scalars['String'];
  installation_id: Scalars['String'];
  team_id?: Maybe<Scalars['String']>;
  user_id: Scalars['String'];
};

export type VercelConfiguration = {
  __typename?: 'VercelConfiguration';
  apiProjects?: Maybe<VercelApiProjectConnection>;
  id: Scalars['ID'];
  url: Scalars['String'];
  vercelId: Scalars['ID'];
};

export type VercelProject = {
  __typename?: 'VercelProject';
  configuration: VercelConfiguration;
  id: Scalars['ID'];
};

export type DailyCount = {
  __typename?: 'dailyCount';
  count: Scalars['Int'];
  date: Scalars['Date'];
};

type AccountChangeName_Account_Team_Fragment = { __typename?: 'Team', id: string, name?: string | null, slug: string } & { ' $fragmentName'?: 'AccountChangeName_Account_Team_Fragment' };

type AccountChangeName_Account_User_Fragment = { __typename?: 'User', id: string, name?: string | null, slug: string } & { ' $fragmentName'?: 'AccountChangeName_Account_User_Fragment' };

export type AccountChangeName_AccountFragment = AccountChangeName_Account_Team_Fragment | AccountChangeName_Account_User_Fragment;

export type AccountChangeName_UpdateAccountMutationVariables = Exact<{
  id: Scalars['ID'];
  name: Scalars['String'];
}>;


export type AccountChangeName_UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Team', id: string, name?: string | null } | { __typename?: 'User', id: string, name?: string | null } };

type AccountChangeSlug_Account_Team_Fragment = { __typename?: 'Team', id: string, slug: string } & { ' $fragmentName'?: 'AccountChangeSlug_Account_Team_Fragment' };

type AccountChangeSlug_Account_User_Fragment = { __typename?: 'User', id: string, slug: string } & { ' $fragmentName'?: 'AccountChangeSlug_Account_User_Fragment' };

export type AccountChangeSlug_AccountFragment = AccountChangeSlug_Account_Team_Fragment | AccountChangeSlug_Account_User_Fragment;

export type AccountChangeSlug_UpdateAccountMutationVariables = Exact<{
  id: Scalars['ID'];
  slug: Scalars['String'];
}>;


export type AccountChangeSlug_UpdateAccountMutation = { __typename?: 'Mutation', updateAccount: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } };

type AccountVercel_Account_Team_Fragment = { __typename?: 'Team', id: string, vercelConfiguration?: { __typename?: 'VercelConfiguration', id: string, url: string } | null } & { ' $fragmentName'?: 'AccountVercel_Account_Team_Fragment' };

type AccountVercel_Account_User_Fragment = { __typename?: 'User', id: string, vercelConfiguration?: { __typename?: 'VercelConfiguration', id: string, url: string } | null } & { ' $fragmentName'?: 'AccountVercel_Account_User_Fragment' };

export type AccountVercel_AccountFragment = AccountVercel_Account_Team_Fragment | AccountVercel_Account_User_Fragment;

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
  slug: Scalars['String'];
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
  slug: Scalars['String'];
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

export type BuildStatusDescription_ProjectFragment = { __typename?: 'Project', referenceBranch?: string | null } & { ' $fragmentName'?: 'BuildStatusDescription_ProjectFragment' };

export type InstallationsSelect_GhApiInstallationFragment = { __typename?: 'GhApiInstallation', id: string, account: { __typename?: 'GhApiInstallationAccount', id: string, login: string, name?: string | null } } & { ' $fragmentName'?: 'InstallationsSelect_GhApiInstallationFragment' };

type PaymentBanner_Account_Team_Fragment = { __typename?: 'Team', id: string, purchaseStatus?: PurchaseStatus | null, permissions: Array<Permission>, stripeCustomerId?: string | null, pendingCancelAt?: any | null, purchase?: { __typename?: 'Purchase', id: string, trialDaysRemaining?: number | null, source: PurchaseSource, paymentMethodFilled: boolean } | null } & { ' $fragmentName'?: 'PaymentBanner_Account_Team_Fragment' };

type PaymentBanner_Account_User_Fragment = { __typename?: 'User', id: string, purchaseStatus?: PurchaseStatus | null, permissions: Array<Permission>, stripeCustomerId?: string | null, pendingCancelAt?: any | null, purchase?: { __typename?: 'Purchase', id: string, trialDaysRemaining?: number | null, source: PurchaseSource, paymentMethodFilled: boolean } | null } & { ' $fragmentName'?: 'PaymentBanner_Account_User_Fragment' };

export type PaymentBanner_AccountFragment = PaymentBanner_Account_Team_Fragment | PaymentBanner_Account_User_Fragment;

export type PaymentBanner_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentBanner_MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, hasSubscribedToTrial: boolean } | null };

export type TerminateTrialMutationVariables = Exact<{
  accountId: Scalars['ID'];
}>;


export type TerminateTrialMutation = { __typename?: 'Mutation', terminateTrial: { __typename: 'Team', id: string, purchaseStatus?: PurchaseStatus | null } | { __typename: 'User', id: string, purchaseStatus?: PurchaseStatus | null } };

type PlanCard_Account_Team_Fragment = { __typename?: 'Team', id: string, stripeCustomerId?: string | null, periodStartDate?: any | null, periodEndDate?: any | null, purchaseStatus?: PurchaseStatus | null, trialStatus?: TrialStatus | null, hasForcedPlan: boolean, pendingCancelAt?: any | null, paymentProvider?: PurchaseSource | null, plan?: { __typename?: 'Plan', id: string, name: string, screenshotsLimitPerMonth: number } | null, purchase?: { __typename?: 'Purchase', id: string, paymentMethodFilled: boolean } | null, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string, public: boolean, currentMonthUsedScreenshots: number }> } } & { ' $fragmentName'?: 'PlanCard_Account_Team_Fragment' };

type PlanCard_Account_User_Fragment = { __typename?: 'User', id: string, stripeCustomerId?: string | null, periodStartDate?: any | null, periodEndDate?: any | null, purchaseStatus?: PurchaseStatus | null, trialStatus?: TrialStatus | null, hasForcedPlan: boolean, pendingCancelAt?: any | null, paymentProvider?: PurchaseSource | null, plan?: { __typename?: 'Plan', id: string, name: string, screenshotsLimitPerMonth: number } | null, purchase?: { __typename?: 'Purchase', id: string, paymentMethodFilled: boolean } | null, projects: { __typename?: 'ProjectConnection', edges: Array<{ __typename?: 'Project', id: string, name: string, public: boolean, currentMonthUsedScreenshots: number }> } } & { ' $fragmentName'?: 'PlanCard_Account_User_Fragment' };

export type PlanCard_AccountFragment = PlanCard_Account_Team_Fragment | PlanCard_Account_User_Fragment;

export type ProjectChangeName_ProjectFragment = { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } & { ' $fragmentName'?: 'ProjectChangeName_ProjectFragment' };

export type ProjectChangeName_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID'];
  name: Scalars['String'];
}>;


export type ProjectChangeName_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, name: string } };

export type ConnectRepository_MeQueryVariables = Exact<{ [key: string]: never; }>;


export type ConnectRepository_MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, ghInstallations: { __typename?: 'GhApiInstallationConnection', edges: Array<(
        { __typename?: 'GhApiInstallation', id: string }
        & { ' $fragmentRefs'?: { 'InstallationsSelect_GhApiInstallationFragment': InstallationsSelect_GhApiInstallationFragment } }
      )>, pageInfo: { __typename?: 'PageInfo', totalCount: number } } } | null };

export type ConnectVercelProject_AccountQueryVariables = Exact<{
  accountId: Scalars['ID'];
}>;


export type ConnectVercelProject_AccountQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, vercelConfiguration?: { __typename?: 'VercelConfiguration', id: string, url: string, apiProjects?: { __typename?: 'VercelApiProjectConnection', projects: Array<(
          { __typename?: 'VercelApiProject', id: string }
          & { ' $fragmentRefs'?: { 'VercelProjectList_VercelApiProjectFragment': VercelProjectList_VercelApiProjectFragment } }
        )> } | null } | null } | { __typename?: 'User', id: string, vercelConfiguration?: { __typename?: 'VercelConfiguration', id: string, url: string, apiProjects?: { __typename?: 'VercelApiProjectConnection', projects: Array<(
          { __typename?: 'VercelApiProject', id: string }
          & { ' $fragmentRefs'?: { 'VercelProjectList_VercelApiProjectFragment': VercelProjectList_VercelApiProjectFragment } }
        )> } | null } | null } | null };

export type DeleteProjectMutationMutationVariables = Exact<{
  projectId: Scalars['ID'];
}>;


export type DeleteProjectMutationMutation = { __typename?: 'Mutation', deleteProject: boolean };

export type ProjectDelete_ProjectFragment = { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } & { ' $fragmentName'?: 'ProjectDelete_ProjectFragment' };

export type ProjectGitRepository_ProjectFragment = { __typename?: 'Project', id: string, ghRepository?: { __typename?: 'GithubRepository', id: string, fullName: string } | null } & { ' $fragmentName'?: 'ProjectGitRepository_ProjectFragment' };

export type ProjectGitRepository_UnlinkRepositoryMutationVariables = Exact<{
  projectId: Scalars['ID'];
}>;


export type ProjectGitRepository_UnlinkRepositoryMutation = { __typename?: 'Mutation', unlinkRepository: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) };

export type ProjectGitRepository_LinkRepositoryMutationVariables = Exact<{
  projectId: Scalars['ID'];
  repo: Scalars['String'];
  owner: Scalars['String'];
}>;


export type ProjectGitRepository_LinkRepositoryMutation = { __typename?: 'Mutation', linkRepository: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) };

export type ProjectReferenceBranch_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID'];
  baselineBranch?: InputMaybe<Scalars['String']>;
}>;


export type ProjectReferenceBranch_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, baselineBranch?: string | null } };

export type ProjectReferenceBranch_ProjectFragment = { __typename?: 'Project', id: string, baselineBranch?: string | null, ghRepository?: { __typename?: 'GithubRepository', id: string, defaultBranch: string } | null } & { ' $fragmentName'?: 'ProjectReferenceBranch_ProjectFragment' };

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
  projectId: Scalars['ID'];
  actualAccountId: Scalars['ID'];
  targetAccountId: Scalars['ID'];
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
  projectId: Scalars['ID'];
  targetAccountId: Scalars['ID'];
  name: Scalars['String'];
}>;


export type ProjectTransfer_TransferProjectMutation = { __typename?: 'Mutation', transferProject: { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, name?: string | null, slug: string } | { __typename?: 'User', id: string, name?: string | null, slug: string } } };

export type ProjectTransfer_ProjectFragment = { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, name?: string | null, slug: string } | { __typename?: 'User', id: string, name?: string | null, slug: string } } & { ' $fragmentName'?: 'ProjectTransfer_ProjectFragment' };

export type ProjectVercel_ProjectFragment = { __typename?: 'Project', id: string, account: { __typename?: 'Team', id: string } | { __typename?: 'User', id: string }, vercelProject?: { __typename?: 'VercelProject', id: string, configuration: { __typename?: 'VercelConfiguration', id: string, url: string } } | null } & { ' $fragmentName'?: 'ProjectVercel_ProjectFragment' };

export type ProjectVercel_UnlinkVercelProjectMutationVariables = Exact<{
  projectId: Scalars['ID'];
}>;


export type ProjectVercel_UnlinkVercelProjectMutation = { __typename?: 'Mutation', unlinkVercelProject: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectVercel_ProjectFragment': ProjectVercel_ProjectFragment } }
  ) };

export type ProjectVercel_LinkVercelProjectMutationVariables = Exact<{
  projectId: Scalars['ID'];
  configurationId: Scalars['ID'];
  vercelProjectId: Scalars['ID'];
}>;


export type ProjectVercel_LinkVercelProjectMutation = { __typename?: 'Mutation', linkVercelProject: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectVercel_ProjectFragment': ProjectVercel_ProjectFragment } }
  ) };

export type ProjectVisibility_UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID'];
  private?: InputMaybe<Scalars['Boolean']>;
}>;


export type ProjectVisibility_UpdateProjectMutation = { __typename?: 'Mutation', updateProject: { __typename?: 'Project', id: string, private?: boolean | null } };

export type ProjectVisibility_ProjectFragment = { __typename?: 'Project', id: string, private?: boolean | null, ghRepository?: { __typename?: 'GithubRepository', id: string, private: boolean } | null } & { ' $fragmentName'?: 'ProjectVisibility_ProjectFragment' };

export type ProjectList_ProjectFragment = { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string, name?: string | null, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) } | { __typename?: 'User', id: string, slug: string, name?: string | null, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) }, builds: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number } } } & { ' $fragmentName'?: 'ProjectList_ProjectFragment' };

export type RepositoryList_GhApiInstallationRepositoriesQueryVariables = Exact<{
  installationId: Scalars['ID'];
  page: Scalars['Int'];
}>;


export type RepositoryList_GhApiInstallationRepositoriesQuery = { __typename?: 'Query', ghApiInstallationRepositories: { __typename?: 'GhApiRepositoryConnection', edges: Array<{ __typename?: 'GhApiRepository', id: string, name: string, updated_at: string, owner_login: string }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean } } };

export type ReviewButton_ProjectFragment = { __typename?: 'Project', name: string, permissions: Array<Permission>, public: boolean, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string }, build?: { __typename?: 'Build', id: string, status: BuildStatus } | null } & { ' $fragmentName'?: 'ReviewButton_ProjectFragment' };

export type SetValidationStatusMutationVariables = Exact<{
  buildId: Scalars['ID'];
  validationStatus: ValidationStatus;
}>;


export type SetValidationStatusMutation = { __typename?: 'Mutation', setValidationStatus: { __typename?: 'Build', id: string, status: BuildStatus } };

export type TeamDelete_TeamFragment = { __typename?: 'Team', id: string, slug: string, purchaseStatus?: PurchaseStatus | null, pendingCancelAt?: any | null } & { ' $fragmentName'?: 'TeamDelete_TeamFragment' };

export type DeleteTeamMutationMutationVariables = Exact<{
  teamAccountId: Scalars['ID'];
}>;


export type DeleteTeamMutationMutation = { __typename?: 'Mutation', deleteTeam: boolean };

export type TeamMembers_TeamMembersQueryVariables = Exact<{
  id: Scalars['ID'];
  first: Scalars['Int'];
  after: Scalars['Int'];
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
  teamAccountId: Scalars['ID'];
}>;


export type TeamMembers_LeaveTeamMutation = { __typename?: 'Mutation', leaveTeam: boolean };

export type TeamMembers_RemoveUserFromTeamMutationVariables = Exact<{
  teamAccountId: Scalars['ID'];
  userAccountId: Scalars['ID'];
}>;


export type TeamMembers_RemoveUserFromTeamMutation = { __typename?: 'Mutation', removeUserFromTeam: { __typename?: 'RemoveUserFromTeamPayload', teamMemberId: string } };

export type RemoveFromTeamDialog_UserFragment = { __typename?: 'User', id: string, name?: string | null, slug: string, avatar: (
    { __typename?: 'AccountAvatar' }
    & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
  ) } & { ' $fragmentName'?: 'RemoveFromTeamDialog_UserFragment' };

export type SetTeamMemberLevelMutationMutationVariables = Exact<{
  teamAccountId: Scalars['ID'];
  userAccountId: Scalars['ID'];
  level: TeamUserLevel;
}>;


export type SetTeamMemberLevelMutationMutation = { __typename?: 'Mutation', setTeamMemberLevel: { __typename?: 'TeamMember', id: string, level: TeamUserLevel } };

export type LevelSelect_TeamMemberFragment = { __typename?: 'TeamMember', id: string, level: TeamUserLevel, user: { __typename?: 'User', id: string } } & { ' $fragmentName'?: 'LevelSelect_TeamMemberFragment' };

export type NewTeam_CreateTeamMutationVariables = Exact<{
  name: Scalars['String'];
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
  id: Scalars['ID'];
  accessToken: Scalars['String'];
}>;


export type Vercel_VercelApiTeamQuery = { __typename?: 'Query', vercelApiTeam?: { __typename?: 'VercelApiTeam', id: string, name: string, slug: string } | null };

export type Vercel_CreateTeamMutationVariables = Exact<{
  name: Scalars['String'];
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
  teamId?: InputMaybe<Scalars['ID']>;
  accessToken: Scalars['String'];
  accountId: Scalars['ID'];
}>;


export type VercelProjectsSummary_Me_VercelApiProjectsQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, ghInstallations: { __typename?: 'GhApiInstallationConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number } } } | null, vercelApiProjects: { __typename?: 'VercelApiProjectConnection', projects: Array<{ __typename?: 'VercelApiProject', id: string, name: string, status: VercelApiProjectStatus, linkedProject?: { __typename?: 'Project', id: string } | null, link?: { __typename: 'VercelApiProjectLinkGithub', org: string, repo: string, repoId: number, type: string } | { __typename: 'VercelApiProjectLinkOther', type: string } | null }> } };

export type VercelProjectsSummary_CreateProjectMutationVariables = Exact<{
  repo: Scalars['String'];
  owner: Scalars['String'];
  accountSlug: Scalars['String'];
}>;


export type VercelProjectsSummary_CreateProjectMutation = { __typename?: 'Mutation', createProject: { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } };

export type VercelProjectsSummary_SetupVercelIntegrationMutationVariables = Exact<{
  input: SetupVercelIntegrationInput;
}>;


export type VercelProjectsSummary_SetupVercelIntegrationMutation = { __typename?: 'Mutation', setupVercelIntegration?: boolean | null };

export type Vercel_RetrieveVercelTokenMutationVariables = Exact<{
  code: Scalars['String'];
}>;


export type Vercel_RetrieveVercelTokenMutation = { __typename?: 'Mutation', retrieveVercelToken: { __typename?: 'VercelApiToken', access_token: string, installation_id: string, user_id: string, team_id?: string | null } };

export type VercelProjectList_VercelApiProjectFragment = { __typename?: 'VercelApiProject', id: string, name: string, link?: { __typename: 'VercelApiProjectLinkGithub', org: string, repo: string, repoId: number, type: string } | { __typename: 'VercelApiProjectLinkOther', type: string } | null, project?: { __typename?: 'Project', id: string, name: string } | null } & { ' $fragmentName'?: 'VercelProjectList_VercelApiProjectFragment' };

export type NewProject_CreateProjectMutationVariables = Exact<{
  repo: Scalars['String'];
  owner: Scalars['String'];
  accountSlug: Scalars['String'];
}>;


export type NewProject_CreateProjectMutation = { __typename?: 'Mutation', createProject: { __typename?: 'Project', id: string, name: string, account: { __typename?: 'Team', id: string, slug: string } | { __typename?: 'User', id: string, slug: string } } };

export type AccountProjects_AccountQueryVariables = Exact<{
  slug: Scalars['String'];
}>;


export type AccountProjects_AccountQuery = { __typename?: 'Query', account?: { __typename?: 'Team', id: string, projects: { __typename?: 'ProjectConnection', edges: Array<(
        { __typename?: 'Project', id: string }
        & { ' $fragmentRefs'?: { 'ProjectList_ProjectFragment': ProjectList_ProjectFragment } }
      )> } } | { __typename?: 'User', id: string, projects: { __typename?: 'ProjectConnection', edges: Array<(
        { __typename?: 'Project', id: string }
        & { ' $fragmentRefs'?: { 'ProjectList_ProjectFragment': ProjectList_ProjectFragment } }
      )> } } | null };

export type AccountSettings_AccountQueryVariables = Exact<{
  slug: Scalars['String'];
}>;


export type AccountSettings_AccountQuery = { __typename?: 'Query', account?: (
    { __typename?: 'Team', id: string, permissions: Array<Permission>, plan?: { __typename?: 'Plan', id: string, name: string } | null }
    & { ' $fragmentRefs'?: { 'TeamMembers_TeamFragment': TeamMembers_TeamFragment;'TeamDelete_TeamFragment': TeamDelete_TeamFragment;'AccountChangeName_Account_Team_Fragment': AccountChangeName_Account_Team_Fragment;'AccountChangeSlug_Account_Team_Fragment': AccountChangeSlug_Account_Team_Fragment;'PlanCard_Account_Team_Fragment': PlanCard_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, permissions: Array<Permission>, plan?: { __typename?: 'Plan', id: string, name: string } | null }
    & { ' $fragmentRefs'?: { 'AccountChangeName_Account_User_Fragment': AccountChangeName_Account_User_Fragment;'AccountChangeSlug_Account_User_Fragment': AccountChangeSlug_Account_User_Fragment;'PlanCard_Account_User_Fragment': PlanCard_Account_User_Fragment } }
  ) | null };

export type Account_AccountQueryVariables = Exact<{
  slug: Scalars['String'];
}>;


export type Account_AccountQuery = { __typename?: 'Query', account?: (
    { __typename?: 'Team', id: string, permissions: Array<Permission> }
    & { ' $fragmentRefs'?: { 'PaymentBanner_Account_Team_Fragment': PaymentBanner_Account_Team_Fragment } }
  ) | (
    { __typename?: 'User', id: string, permissions: Array<Permission> }
    & { ' $fragmentRefs'?: { 'PaymentBanner_Account_User_Fragment': PaymentBanner_Account_User_Fragment } }
  ) | null };

export type BuildDetail_BuildFragment = { __typename?: 'Build', stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', branch: string, createdAt: any } | null, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', branch: string, createdAt: any } } & { ' $fragmentName'?: 'BuildDetail_BuildFragment' };

export type BuildDiffState_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
  buildNumber: Scalars['Int'];
  after: Scalars['Int'];
  first: Scalars['Int'];
}>;


export type BuildDiffState_ProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, build?: { __typename?: 'Build', id: string, screenshotDiffs: { __typename?: 'ScreenshotDiffConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, edges: Array<{ __typename?: 'ScreenshotDiff', id: string, status: ScreenshotDiffStatus, url?: string | null, name: string, width?: number | null, height?: number | null, flakyDetected: boolean, baseScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null } | null, compareScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null } | null, test?: { __typename?: 'Test', id: string, status: TestStatus, unstable: boolean, resolvedDate?: any | null, mute: boolean, muteUntil?: any | null } | null }> } } | null } | null };

export type BuildHeader_BuildFragment = (
  { __typename?: 'Build', name: string }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
) & { ' $fragmentName'?: 'BuildHeader_BuildFragment' };

export type BuildHeader_ProjectFragment = (
  { __typename?: 'Project' }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_ProjectFragment': BuildStatusChip_ProjectFragment;'ReviewButton_ProjectFragment': ReviewButton_ProjectFragment } }
) & { ' $fragmentName'?: 'BuildHeader_ProjectFragment' };

export type BuildInfos_BuildFragment = { __typename?: 'Build', createdAt: any, name: string, prNumber?: number | null, stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', commit: string, branch: string } | null, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', commit: string, branch: string } } & { ' $fragmentName'?: 'BuildInfos_BuildFragment' };

export type BuildPage_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
  buildNumber: Scalars['Int'];
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
  { __typename?: 'Build', status: BuildStatus, stats: { __typename?: 'BuildStats', total: number, failure: number, changed: number, added: number, removed: number, unchanged: number } }
  & { ' $fragmentRefs'?: { 'BuildSidebar_BuildFragment': BuildSidebar_BuildFragment;'BuildStatusDescription_BuildFragment': BuildStatusDescription_BuildFragment;'BuildDetail_BuildFragment': BuildDetail_BuildFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_BuildFragment' };

export type BuildWorkspace_ProjectFragment = (
  { __typename?: 'Project' }
  & { ' $fragmentRefs'?: { 'BuildStatusDescription_ProjectFragment': BuildStatusDescription_ProjectFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_ProjectFragment' };

type OvercapacityBanner_Account_Team_Fragment = { __typename?: 'Team', consumptionRatio?: number | null, plan?: { __typename?: 'Plan', id: string, name: string } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Account_Team_Fragment' };

type OvercapacityBanner_Account_User_Fragment = { __typename?: 'User', consumptionRatio?: number | null, plan?: { __typename?: 'Plan', id: string, name: string } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Account_User_Fragment' };

export type OvercapacityBanner_AccountFragment = OvercapacityBanner_Account_Team_Fragment | OvercapacityBanner_Account_User_Fragment;

export type Invite_InvitationQueryVariables = Exact<{
  token: Scalars['String'];
}>;


export type Invite_InvitationQuery = { __typename?: 'Query', invitation?: { __typename?: 'Team', id: string, name?: string | null, slug: string, avatar: (
      { __typename?: 'AccountAvatar' }
      & { ' $fragmentRefs'?: { 'AccountAvatarFragmentFragment': AccountAvatarFragmentFragment } }
    ) } | null, me?: { __typename?: 'User', id: string, teams: Array<{ __typename?: 'Team', id: string }> } | null };

export type Invite_AcceptInvitationMutationVariables = Exact<{
  token: Scalars['String'];
}>;


export type Invite_AcceptInvitationMutation = { __typename?: 'Mutation', acceptInvitation: { __typename?: 'Team', id: string, slug: string } };

export type ProjectBuilds_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
}>;


export type ProjectBuilds_ProjectQuery = { __typename?: 'Query', project?: (
    { __typename?: 'Project', id: string, permissions: Array<Permission> }
    & { ' $fragmentRefs'?: { 'GettingStarted_ProjectFragment': GettingStarted_ProjectFragment;'BuildStatusChip_ProjectFragment': BuildStatusChip_ProjectFragment } }
  ) | null };

export type ProjectBuilds_Project_BuildsQueryVariables = Exact<{
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
  after: Scalars['Int'];
  first: Scalars['Int'];
}>;


export type ProjectBuilds_Project_BuildsQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, builds: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number, hasNextPage: boolean }, edges: Array<(
        { __typename?: 'Build', id: string, number: number, createdAt: any, name: string, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', id: string, branch: string, commit: string } }
        & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
      )> } } | null };

export type GettingStarted_ProjectFragment = { __typename?: 'Project', token?: string | null } & { ' $fragmentName'?: 'GettingStarted_ProjectFragment' };

export type ProjectSettings_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
}>;


export type ProjectSettings_ProjectQuery = { __typename?: 'Query', project?: (
    { __typename?: 'Project', id: string }
    & { ' $fragmentRefs'?: { 'ProjectChangeName_ProjectFragment': ProjectChangeName_ProjectFragment;'ProjectToken_ProjectFragment': ProjectToken_ProjectFragment;'ProjectReferenceBranch_ProjectFragment': ProjectReferenceBranch_ProjectFragment;'ProjectVisibility_ProjectFragment': ProjectVisibility_ProjectFragment;'ProjectTransfer_ProjectFragment': ProjectTransfer_ProjectFragment;'ProjectDelete_ProjectFragment': ProjectDelete_ProjectFragment;'ProjectGitRepository_ProjectFragment': ProjectGitRepository_ProjectFragment } }
  ) | null };

export type FlakyTests_Project_TestsQueryVariables = Exact<{
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
  after: Scalars['Int'];
  first: Scalars['Int'];
}>;


export type FlakyTests_Project_TestsQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, tests: { __typename?: 'TestConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number, hasNextPage: boolean }, edges: Array<{ __typename?: 'Test', id: string, name: string, buildName: string, status: TestStatus, resolvedDate?: any | null, mute: boolean, muteUntil?: any | null, stabilityScore?: number | null, lastSeen?: any | null, unstable: boolean, totalBuilds: number, dailyChanges: Array<{ __typename?: 'dailyCount', date: any, count: number }>, screenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null } | null }> } } | null };

export type MuteTestsMutationVariables = Exact<{
  ids: Array<Scalars['String']> | Scalars['String'];
  muted: Scalars['Boolean'];
  muteUntil?: InputMaybe<Scalars['String']>;
}>;


export type MuteTestsMutation = { __typename?: 'Mutation', muteTests: { __typename?: 'MuteUpdateTest', ids: Array<string>, mute: boolean, muteUntil?: string | null } };

export type UpdateStatusesMutationMutationVariables = Exact<{
  ids: Array<Scalars['String']> | Scalars['String'];
  status: TestStatus;
}>;


export type UpdateStatusesMutationMutation = { __typename?: 'Mutation', updateTestStatuses: { __typename?: 'UpdatedTestStatuses', ids: Array<string>, status: TestStatus } };

export type Project_ProjectQueryVariables = Exact<{
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
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
export const AccountVercel_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountVercel_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"vercelConfiguration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]} as unknown as DocumentNode<AccountVercel_AccountFragment, unknown>;
export const AccountAvatarFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<AccountAvatarFragmentFragment, unknown>;
export const AccountPlanChip_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountPlanChip_AccountFragment, unknown>;
export const AccountItem_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountItem_AccountFragment, unknown>;
export const AccountBreadcrumbMenu_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<AccountBreadcrumbMenu_AccountFragment, unknown>;
export const InstallationsSelect_GhApiInstallationFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InstallationsSelect_GhApiInstallation"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GhApiInstallation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<InstallationsSelect_GhApiInstallationFragment, unknown>;
export const PaymentBanner_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}}]} as unknown as DocumentNode<PaymentBanner_AccountFragment, unknown>;
export const PlanCard_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanCard_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndDate"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"trialStatus"}},{"kind":"Field","name":{"kind":"Name","value":"hasForcedPlan"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"paymentProvider"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotsLimitPerMonth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"currentMonthUsedScreenshots"}}]}}]}}]}}]} as unknown as DocumentNode<PlanCard_AccountFragment, unknown>;
export const ProjectChangeName_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectChangeName_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectChangeName_ProjectFragment, unknown>;
export const ProjectDelete_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDelete_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectDelete_ProjectFragment, unknown>;
export const ProjectGitRepository_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}}]}}]} as unknown as DocumentNode<ProjectGitRepository_ProjectFragment, unknown>;
export const ProjectReferenceBranch_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectReferenceBranch_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}}]} as unknown as DocumentNode<ProjectReferenceBranch_ProjectFragment, unknown>;
export const ProjectToken_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectToken_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]} as unknown as DocumentNode<ProjectToken_ProjectFragment, unknown>;
export const ProjectTransfer_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ProjectTransfer_AccountFragment, unknown>;
export const ProjectTransfer_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_ProjectFragment, unknown>;
export const ProjectVercel_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVercel_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"vercelProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configuration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectVercel_ProjectFragment, unknown>;
export const ProjectVisibility_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVisibility_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}}]} as unknown as DocumentNode<ProjectVisibility_ProjectFragment, unknown>;
export const ProjectList_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectList_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"0"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ProjectList_ProjectFragment, unknown>;
export const TeamDelete_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamDelete_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}}]}}]} as unknown as DocumentNode<TeamDelete_TeamFragment, unknown>;
export const RemoveFromTeamDialog_UserFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<RemoveFromTeamDialog_UserFragment, unknown>;
export const LevelSelect_TeamMemberFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<LevelSelect_TeamMemberFragment, unknown>;
export const TeamMembers_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamMembers_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"inviteLink"}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelSelect_TeamMember"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<TeamMembers_TeamFragment, unknown>;
export const ChooseTeam_TeamFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChooseTeam_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<ChooseTeam_TeamFragment, unknown>;
export const VercelProjectList_VercelApiProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VercelProjectList_VercelApiProject"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VercelApiProject"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"link"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VercelApiProjectLinkGithub"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"org"}},{"kind":"Field","name":{"kind":"Name","value":"repo"}},{"kind":"Field","name":{"kind":"Name","value":"repoId"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"project"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<VercelProjectList_VercelApiProjectFragment, unknown>;
export const BuildStatusDescription_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<BuildStatusDescription_BuildFragment, unknown>;
export const BuildStatusChip_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<BuildStatusChip_BuildFragment, unknown>;
export const BuildHeader_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<BuildHeader_BuildFragment, unknown>;
export const BuildStatusDescription_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildStatusDescription_ProjectFragment, unknown>;
export const BuildStatusChip_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildStatusChip_ProjectFragment, unknown>;
export const ReviewButton_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ReviewButton_ProjectFragment, unknown>;
export const BuildHeader_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewButton_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<BuildHeader_ProjectFragment, unknown>;
export const BuildInfos_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"prNumber"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}}]}}]} as unknown as DocumentNode<BuildInfos_BuildFragment, unknown>;
export const BuildSidebar_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"prNumber"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}}]}}]} as unknown as DocumentNode<BuildSidebar_BuildFragment, unknown>;
export const BuildDetail_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BuildDetail_BuildFragment, unknown>;
export const BuildWorkspace_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"prNumber"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BuildWorkspace_BuildFragment, unknown>;
export const BuildWorkspace_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildWorkspace_ProjectFragment, unknown>;
export const OvercapacityBanner_AccountFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}}]} as unknown as DocumentNode<OvercapacityBanner_AccountFragment, unknown>;
export const GettingStarted_ProjectFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GettingStarted_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]} as unknown as DocumentNode<GettingStarted_ProjectFragment, unknown>;
export const AccountChangeName_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountChangeName_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountChangeName_UpdateAccountMutation, AccountChangeName_UpdateAccountMutationVariables>;
export const AccountChangeSlug_UpdateAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AccountChangeSlug_updateAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<AccountChangeSlug_UpdateAccountMutation, AccountChangeSlug_UpdateAccountMutationVariables>;
export const AccountBreadcrumb_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountBreadcrumb_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<AccountBreadcrumb_AccountQuery, AccountBreadcrumb_AccountQueryVariables>;
export const AccountBreadcrumbMenu_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountBreadcrumbMenu_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountBreadcrumbMenu_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]} as unknown as DocumentNode<AccountBreadcrumbMenu_MeQuery, AccountBreadcrumbMenu_MeQueryVariables>;
export const ProjectBreadcrumbMenu_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBreadcrumbMenu_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ProjectBreadcrumbMenu_AccountQuery, ProjectBreadcrumbMenu_AccountQueryVariables>;
export const PaymentBanner_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PaymentBanner_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"hasSubscribedToTrial"}}]}}]}}]} as unknown as DocumentNode<PaymentBanner_MeQuery, PaymentBanner_MeQueryVariables>;
export const TerminateTrialDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"terminateTrial"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"terminateTrial"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"__typename"}}]}}]}}]} as unknown as DocumentNode<TerminateTrialMutation, TerminateTrialMutationVariables>;
export const ProjectChangeName_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectChangeName_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ProjectChangeName_UpdateProjectMutation, ProjectChangeName_UpdateProjectMutationVariables>;
export const ConnectRepository_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ConnectRepository_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghInstallations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"InstallationsSelect_GhApiInstallation"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"InstallationsSelect_GhApiInstallation"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"GhApiInstallation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ConnectRepository_MeQuery, ConnectRepository_MeQueryVariables>;
export const ConnectVercelProject_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ConnectVercelProject_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"account"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"vercelConfiguration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"apiProjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"VercelProjectList_VercelApiProject"}}]}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"VercelProjectList_VercelApiProject"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VercelApiProject"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"link"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"VercelApiProjectLinkGithub"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"org"}},{"kind":"Field","name":{"kind":"Name","value":"repo"}},{"kind":"Field","name":{"kind":"Name","value":"repoId"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"project"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ConnectVercelProject_AccountQuery, ConnectVercelProject_AccountQueryVariables>;
export const DeleteProjectMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProjectMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}]}}]} as unknown as DocumentNode<DeleteProjectMutationMutation, DeleteProjectMutationMutationVariables>;
export const ProjectGitRepository_UnlinkRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_unlinkRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkRepository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}}]}}]} as unknown as DocumentNode<ProjectGitRepository_UnlinkRepositoryMutation, ProjectGitRepository_UnlinkRepositoryMutationVariables>;
export const ProjectGitRepository_LinkRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectGitRepository_linkRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkRepository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}}]}}]} as unknown as DocumentNode<ProjectGitRepository_LinkRepositoryMutation, ProjectGitRepository_LinkRepositoryMutationVariables>;
export const ProjectReferenceBranch_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectReferenceBranch_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baselineBranch"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"baselineBranch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baselineBranch"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}}]}}]}}]} as unknown as DocumentNode<ProjectReferenceBranch_UpdateProjectMutation, ProjectReferenceBranch_UpdateProjectMutationVariables>;
export const TransferProject_MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TransferProject_me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountItem_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountPlanChip_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountItem_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountPlanChip_Account"}}]}}]} as unknown as DocumentNode<TransferProject_MeQuery, TransferProject_MeQueryVariables>;
export const ProjectTransfer_ReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectTransfer_Review"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"actualAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalScreenshots"}}]}},{"kind":"Field","alias":{"kind":"Name","value":"actualAccount"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"actualAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Account"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"targetAccount"},"name":{"kind":"Name","value":"accountById"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Account"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_ReviewQuery, ProjectTransfer_ReviewQueryVariables>;
export const ProjectTransfer_TransferProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectTransfer_TransferProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transferProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"targetAccountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"targetAccountId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectTransfer_TransferProjectMutation, ProjectTransfer_TransferProjectMutationVariables>;
export const ProjectVercel_UnlinkVercelProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectVercel_unlinkVercelProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkVercelProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectVercel_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVercel_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"vercelProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configuration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectVercel_UnlinkVercelProjectMutation, ProjectVercel_UnlinkVercelProjectMutationVariables>;
export const ProjectVercel_LinkVercelProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectVercel_linkVercelProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"configurationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"vercelProjectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkVercelProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"configurationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"configurationId"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"vercelProjectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"vercelProjectId"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectVercel_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVercel_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"vercelProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"configuration"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]} as unknown as DocumentNode<ProjectVercel_LinkVercelProjectMutation, ProjectVercel_LinkVercelProjectMutationVariables>;
export const ProjectVisibility_UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ProjectVisibility_updateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"private"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"private"},"value":{"kind":"Variable","name":{"kind":"Name","value":"private"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}}]} as unknown as DocumentNode<ProjectVisibility_UpdateProjectMutation, ProjectVisibility_UpdateProjectMutationVariables>;
export const RepositoryList_GhApiInstallationRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepositoryList_ghApiInstallationRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"installationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ghApiInstallationRepositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"installationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"installationId"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"updated_at"}},{"kind":"Field","name":{"kind":"Name","value":"owner_login"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}}]}}]}}]} as unknown as DocumentNode<RepositoryList_GhApiInstallationRepositoriesQuery, RepositoryList_GhApiInstallationRepositoriesQueryVariables>;
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
export const VercelProjectsSummary_CreateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VercelProjectsSummary_createProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<VercelProjectsSummary_CreateProjectMutation, VercelProjectsSummary_CreateProjectMutationVariables>;
export const VercelProjectsSummary_SetupVercelIntegrationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VercelProjectsSummary_setupVercelIntegration"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetupVercelIntegrationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setupVercelIntegration"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<VercelProjectsSummary_SetupVercelIntegrationMutation, VercelProjectsSummary_SetupVercelIntegrationMutationVariables>;
export const Vercel_RetrieveVercelTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Vercel_retrieveVercelToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"retrieveVercelToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"access_token"}},{"kind":"Field","name":{"kind":"Name","value":"installation_id"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}},{"kind":"Field","name":{"kind":"Name","value":"team_id"}}]}}]}}]} as unknown as DocumentNode<Vercel_RetrieveVercelTokenMutation, Vercel_RetrieveVercelTokenMutationVariables>;
export const NewProject_CreateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NewProject_createProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repo"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"repo"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repo"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<NewProject_CreateProjectMutation, NewProject_CreateProjectMutationVariables>;
export const AccountProjects_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountProjects_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectList_Project"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectList_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"0"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]} as unknown as DocumentNode<AccountProjects_AccountQuery, AccountProjects_AccountQueryVariables>;
export const AccountSettings_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccountSettings_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamMembers_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"TeamDelete_Team"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountChangeName_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountChangeSlug_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PlanCard_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelSelect_TeamMember"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TeamMember"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamMembers_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"inviteLink"}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemoveFromTeamDialog_User"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelSelect_TeamMember"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TeamDelete_Team"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Team"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeName_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountChangeSlug_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanCard_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"periodStartDate"}},{"kind":"Field","name":{"kind":"Name","value":"periodEndDate"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"trialStatus"}},{"kind":"Field","name":{"kind":"Name","value":"hasForcedPlan"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"paymentProvider"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotsLimitPerMonth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"100"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"currentMonthUsedScreenshots"}}]}}]}}]}}]} as unknown as DocumentNode<AccountSettings_AccountQuery, AccountSettings_AccountQueryVariables>;
export const Account_AccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Account_account"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"slug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"slug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"slug"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}}]} as unknown as DocumentNode<Account_AccountQuery, Account_AccountQueryVariables>;
export const BuildDiffState_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildDiffState_Project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotDiffs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"flakyDetected"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"test"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"unstable"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedDate"}},{"kind":"Field","name":{"kind":"Name","value":"mute"}},{"kind":"Field","name":{"kind":"Name","value":"muteUntil"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<BuildDiffState_ProjectQuery, BuildDiffState_ProjectQueryVariables>;
export const BuildPage_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildPage_Project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Project"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"OvercapacityBanner_Account"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Build"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"public"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"prNumber"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewButton_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}}]}}]}}]} as unknown as DocumentNode<BuildPage_ProjectQuery, BuildPage_ProjectQueryVariables>;
export const Invite_InvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Invite_invitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"avatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AccountAvatarFragment"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"teams"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AccountAvatarFragment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AccountAvatar"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"size"},"value":{"kind":"IntValue","value":"64"}}]},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"initial"}}]}}]} as unknown as DocumentNode<Invite_InvitationQuery, Invite_InvitationQueryVariables>;
export const Invite_AcceptInvitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Invite_acceptInvitation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"acceptInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]} as unknown as DocumentNode<Invite_AcceptInvitationMutation, Invite_AcceptInvitationMutationVariables>;
export const ProjectBuilds_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBuilds_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GettingStarted_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GettingStarted_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Project"}}]}}]} as unknown as DocumentNode<ProjectBuilds_ProjectQuery, ProjectBuilds_ProjectQueryVariables>;
export const ProjectBuilds_Project_BuildsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectBuilds_project_Builds"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<ProjectBuilds_Project_BuildsQuery, ProjectBuilds_Project_BuildsQueryVariables>;
export const ProjectSettings_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectSettings_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectChangeName_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectToken_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectReferenceBranch_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectVisibility_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectTransfer_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectDelete_Project"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectGitRepository_Project"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectChangeName_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectToken_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectReferenceBranch_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectVisibility_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"private"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectTransfer_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectDelete_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectGitRepository_Project"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Project"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ghRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}}]}}]}}]} as unknown as DocumentNode<ProjectSettings_ProjectQuery, ProjectSettings_ProjectQueryVariables>;
export const FlakyTests_Project_TestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FlakyTests_project_tests"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"tests"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"buildName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"resolvedDate"}},{"kind":"Field","name":{"kind":"Name","value":"mute"}},{"kind":"Field","name":{"kind":"Name","value":"muteUntil"}},{"kind":"Field","name":{"kind":"Name","value":"stabilityScore"}},{"kind":"Field","name":{"kind":"Name","value":"lastSeen"}},{"kind":"Field","name":{"kind":"Name","value":"unstable"}},{"kind":"Field","name":{"kind":"Name","value":"dailyChanges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalBuilds"}},{"kind":"Field","name":{"kind":"Name","value":"screenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<FlakyTests_Project_TestsQuery, FlakyTests_Project_TestsQueryVariables>;
export const MuteTestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"muteTests"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"muted"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"muteUntil"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"muteTests"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}},{"kind":"Argument","name":{"kind":"Name","value":"muted"},"value":{"kind":"Variable","name":{"kind":"Name","value":"muted"}}},{"kind":"Argument","name":{"kind":"Name","value":"muteUntil"},"value":{"kind":"Variable","name":{"kind":"Name","value":"muteUntil"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ids"}},{"kind":"Field","name":{"kind":"Name","value":"mute"}},{"kind":"Field","name":{"kind":"Name","value":"muteUntil"}}]}}]}}]} as unknown as DocumentNode<MuteTestsMutation, MuteTestsMutationVariables>;
export const UpdateStatusesMutationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"updateStatusesMutation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ids"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TestStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTestStatuses"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ids"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ids"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ids"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<UpdateStatusesMutationMutation, UpdateStatusesMutationMutationVariables>;
export const Project_ProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Project_project"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountSlug"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSlug"}}},{"kind":"Argument","name":{"kind":"Name","value":"projectName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"tests"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"0"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"PaymentBanner_Account"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PaymentBanner_Account"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Account"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"purchaseStatus"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"pendingCancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"trialDaysRemaining"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethodFilled"}}]}}]}}]} as unknown as DocumentNode<Project_ProjectQuery, Project_ProjectQueryVariables>;