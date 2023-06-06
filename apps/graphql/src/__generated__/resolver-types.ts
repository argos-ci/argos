import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { AccountAvatar, Build, GithubAccount, GithubRepository, Plan, Purchase, Screenshot, ScreenshotBucket, ScreenshotDiff, Project, Account, TeamUser, Test } from '@argos-ci/database/models';
import type { GhApiInstallation, GhApiRepository } from '@argos-ci/github';
import type { VercelProject, VercelTeam } from '@argos-ci/vercel';
import type { Context } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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

export type IAccount = {
  avatar: IAccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  ghAccount?: Maybe<IGithubAccount>;
  hasForcedPlan: Scalars['Boolean'];
  hasPaidPlan: Scalars['Boolean'];
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  paymentProvider?: Maybe<IPurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']>;
  periodEndDate?: Maybe<Scalars['DateTime']>;
  periodStartDate?: Maybe<Scalars['DateTime']>;
  permissions: Array<IPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  purchase?: Maybe<IPurchase>;
  purchaseStatus?: Maybe<IPurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  slug: Scalars['String'];
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  trialStatus?: Maybe<ITrialStatus>;
};


export type IAccountProjectsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type IAccountAvatar = {
  __typename?: 'AccountAvatar';
  color: Scalars['String'];
  initial: Scalars['String'];
  url?: Maybe<Scalars['String']>;
};


export type IAccountAvatarUrlArgs = {
  size: Scalars['Int'];
};

export type IBuild = INode & {
  __typename?: 'Build';
  /** The screenshot bucket of the baselineBranch */
  baseScreenshotBucket?: Maybe<IScreenshotBucket>;
  /** Received batch count  */
  batchCount?: Maybe<Scalars['Int']>;
  /** The screenshot bucket of the build commit */
  compareScreenshotBucket: IScreenshotBucket;
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  /** Build name */
  name: Scalars['String'];
  /** Continuous number. It is incremented after each build */
  number: Scalars['Int'];
  /** Pull request number */
  prNumber?: Maybe<Scalars['Int']>;
  /** The screenshot diffs between the base screenshot bucket of the compare screenshot bucket */
  screenshotDiffs: IScreenshotDiffConnection;
  /** Build stats */
  stats: IBuildStats;
  /** Review status, conclusion or job status */
  status: IBuildStatus;
  /** Expected batch count */
  totalBatch?: Maybe<Scalars['Int']>;
  /** Build type */
  type?: Maybe<IBuildType>;
  updatedAt: Scalars['DateTime'];
};


export type IBuildScreenshotDiffsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type IBuildConnection = IConnection & {
  __typename?: 'BuildConnection';
  edges: Array<IBuild>;
  pageInfo: IPageInfo;
};

export type IBuildStats = {
  __typename?: 'BuildStats';
  added: Scalars['Int'];
  changed: Scalars['Int'];
  failure: Scalars['Int'];
  removed: Scalars['Int'];
  total: Scalars['Int'];
  unchanged: Scalars['Int'];
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

export type ICreateProjectInput = {
  accountSlug: Scalars['String'];
  owner: Scalars['String'];
  repo: Scalars['String'];
};

export type ICreateTeamInput = {
  name: Scalars['String'];
};

export type IDeleteTeamInput = {
  accountId: Scalars['ID'];
};

export type IGhApiInstallation = INode & {
  __typename?: 'GhApiInstallation';
  account: IGhApiInstallationAccount;
  id: Scalars['ID'];
};

export type IGhApiInstallationAccount = INode & {
  __typename?: 'GhApiInstallationAccount';
  id: Scalars['ID'];
  login: Scalars['String'];
  name?: Maybe<Scalars['String']>;
};

export type IGhApiInstallationConnection = IConnection & {
  __typename?: 'GhApiInstallationConnection';
  edges: Array<IGhApiInstallation>;
  pageInfo: IPageInfo;
};

export type IGhApiRepository = INode & {
  __typename?: 'GhApiRepository';
  id: Scalars['ID'];
  name: Scalars['String'];
  owner_login: Scalars['String'];
  updated_at: Scalars['String'];
};

export type IGhApiRepositoryConnection = IConnection & {
  __typename?: 'GhApiRepositoryConnection';
  edges: Array<IGhApiRepository>;
  pageInfo: IPageInfo;
};

export type IGithubAccount = INode & {
  __typename?: 'GithubAccount';
  id: Scalars['ID'];
  login: Scalars['String'];
};

export type IGithubRepository = INode & {
  __typename?: 'GithubRepository';
  defaultBranch: Scalars['String'];
  fullName: Scalars['String'];
  id: Scalars['ID'];
  private: Scalars['Boolean'];
};

export enum IJobStatus {
  Aborted = 'aborted',
  Complete = 'complete',
  Error = 'error',
  Pending = 'pending',
  Progress = 'progress'
}

export type ILeaveTeamInput = {
  teamAccountId: Scalars['ID'];
};

export type ILinkRepositoryInput = {
  owner: Scalars['String'];
  projectId: Scalars['ID'];
  repo: Scalars['String'];
};

export type IMutation = {
  __typename?: 'Mutation';
  /** Accept an invitation to join a team */
  acceptInvitation: ITeam;
  /** Create a Project */
  createProject: IProject;
  /** Create a team */
  createTeam: ITeam;
  /** Delete Project */
  deleteProject: Scalars['Boolean'];
  /** Delete team and all its projects */
  deleteTeam: Scalars['Boolean'];
  /** Leave a team */
  leaveTeam: Scalars['Boolean'];
  /** Link Repository */
  linkRepository: IProject;
  /** Mute or unmute tests */
  muteTests: IMuteUpdateTest;
  ping: Scalars['Boolean'];
  /** Remove a user from a team */
  removeUserFromTeam: IRemoveUserFromTeamPayload;
  /** Retrieve a Vercel API token from a code */
  retrieveVercelToken: IVercelApiToken;
  /** Set member level */
  setTeamMemberLevel: ITeamMember;
  /** Change the validationStatus on a build */
  setValidationStatus: IBuild;
  /** Finish the Vercel integration setup */
  setupVercelIntegration?: Maybe<Scalars['Boolean']>;
  /** Terminate trial early */
  terminateTrial: IAccount;
  /** Transfer Project to another account */
  transferProject: IProject;
  /** Unlink Repository */
  unlinkRepository: IProject;
  /** Update Account */
  updateAccount: IAccount;
  /** Update Project */
  updateProject: IProject;
  /** Update test statuses */
  updateTestStatuses: IUpdatedTestStatuses;
};


export type IMutationAcceptInvitationArgs = {
  token: Scalars['String'];
};


export type IMutationCreateProjectArgs = {
  input: ICreateProjectInput;
};


export type IMutationCreateTeamArgs = {
  input: ICreateTeamInput;
};


export type IMutationDeleteProjectArgs = {
  id: Scalars['ID'];
};


export type IMutationDeleteTeamArgs = {
  input: IDeleteTeamInput;
};


export type IMutationLeaveTeamArgs = {
  input: ILeaveTeamInput;
};


export type IMutationLinkRepositoryArgs = {
  input: ILinkRepositoryInput;
};


export type IMutationMuteTestsArgs = {
  ids: Array<Scalars['String']>;
  muteUntil?: InputMaybe<Scalars['String']>;
  muted: Scalars['Boolean'];
};


export type IMutationRemoveUserFromTeamArgs = {
  input: IRemoveUserFromTeamInput;
};


export type IMutationRetrieveVercelTokenArgs = {
  code: Scalars['String'];
};


export type IMutationSetTeamMemberLevelArgs = {
  input: ISetTeamMemberLevelInput;
};


export type IMutationSetValidationStatusArgs = {
  buildId: Scalars['ID'];
  validationStatus: IValidationStatus;
};


export type IMutationSetupVercelIntegrationArgs = {
  input: ISetupVercelIntegrationInput;
};


export type IMutationTerminateTrialArgs = {
  accountId: Scalars['ID'];
};


export type IMutationTransferProjectArgs = {
  input: ITransferProjectInput;
};


export type IMutationUnlinkRepositoryArgs = {
  input: IUnlinkRepositoryInput;
};


export type IMutationUpdateAccountArgs = {
  input: IUpdateAccountInput;
};


export type IMutationUpdateProjectArgs = {
  input: IUpdateProjectInput;
};


export type IMutationUpdateTestStatusesArgs = {
  ids: Array<Scalars['String']>;
  status: ITestStatus;
};

export type IMuteUpdateTest = {
  __typename?: 'MuteUpdateTest';
  ids: Array<Scalars['String']>;
  mute: Scalars['Boolean'];
  muteUntil?: Maybe<Scalars['String']>;
};

export type INode = {
  id: Scalars['ID'];
};

export type IPageInfo = {
  __typename?: 'PageInfo';
  hasNextPage: Scalars['Boolean'];
  totalCount: Scalars['Int'];
};

export enum IPermission {
  Read = 'read',
  Write = 'write'
}

export type IPlan = INode & {
  __typename?: 'Plan';
  id: Scalars['ID'];
  name: Scalars['String'];
  screenshotsLimitPerMonth: Scalars['Int'];
};

export type IProject = INode & {
  __typename?: 'Project';
  /** Owner of the repository */
  account: IAccount;
  /** Override branch name */
  baselineBranch?: Maybe<Scalars['String']>;
  /** A single build linked to the repository */
  build?: Maybe<IBuild>;
  /** Builds associated to the repository */
  builds: IBuildConnection;
  /** Current month used screenshots */
  currentMonthUsedScreenshots: Scalars['Int'];
  /** Repositories associated to the project */
  ghRepository?: Maybe<IGithubRepository>;
  id: Scalars['ID'];
  name: Scalars['String'];
  /** Determine if the current user has write access to the project */
  permissions: Array<IPermission>;
  /** Override repository's Github privacy */
  private?: Maybe<Scalars['Boolean']>;
  /** Check if the project is public or not */
  public: Scalars['Boolean'];
  /** Reference branch */
  referenceBranch?: Maybe<Scalars['String']>;
  /** Tests associated to the repository */
  tests: ITestConnection;
  token?: Maybe<Scalars['String']>;
  totalScreenshots: Scalars['Int'];
};


export type IProjectBuildArgs = {
  number: Scalars['Int'];
};


export type IProjectBuildsArgs = {
  after?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
};


export type IProjectTestsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type IProjectConnection = IConnection & {
  __typename?: 'ProjectConnection';
  edges: Array<IProject>;
  pageInfo: IPageInfo;
};

export type IPurchase = INode & {
  __typename?: 'Purchase';
  id: Scalars['ID'];
  paymentMethodFilled: Scalars['Boolean'];
  source: IPurchaseSource;
  trialDaysRemaining?: Maybe<Scalars['Int']>;
};

export enum IPurchaseSource {
  Github = 'github',
  Stripe = 'stripe'
}

export enum IPurchaseStatus {
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

export type IQuery = {
  __typename?: 'Query';
  /** Get Account by slug */
  account?: Maybe<IAccount>;
  /** Get Account by id */
  accountById?: Maybe<IAccount>;
  ghApiInstallationRepositories: IGhApiRepositoryConnection;
  invitation?: Maybe<ITeam>;
  /** Get the authenticated user */
  me?: Maybe<IUser>;
  ping: Scalars['Boolean'];
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
  slug: Scalars['String'];
};


export type IQueryAccountByIdArgs = {
  id: Scalars['ID'];
};


export type IQueryGhApiInstallationRepositoriesArgs = {
  installationId: Scalars['ID'];
  page: Scalars['Int'];
};


export type IQueryInvitationArgs = {
  token: Scalars['String'];
};


export type IQueryProjectArgs = {
  accountSlug: Scalars['String'];
  projectName: Scalars['String'];
};


export type IQueryProjectByIdArgs = {
  id: Scalars['ID'];
};


export type IQueryTeamByIdArgs = {
  id: Scalars['ID'];
};


export type IQueryVercelApiProjectsArgs = {
  accessToken: Scalars['String'];
  limit?: InputMaybe<Scalars['Int']>;
  teamId?: InputMaybe<Scalars['ID']>;
};


export type IQueryVercelApiTeamArgs = {
  accessToken: Scalars['String'];
  id: Scalars['ID'];
};

export type IRemoveUserFromTeamInput = {
  teamAccountId: Scalars['ID'];
  userAccountId: Scalars['ID'];
};

export type IRemoveUserFromTeamPayload = {
  __typename?: 'RemoveUserFromTeamPayload';
  teamMemberId: Scalars['ID'];
};

export type IScreenshot = INode & {
  __typename?: 'Screenshot';
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  url: Scalars['String'];
  width?: Maybe<Scalars['Int']>;
};

export type IScreenshotBucket = INode & {
  __typename?: 'ScreenshotBucket';
  branch: Scalars['String'];
  commit: Scalars['String'];
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
};

export type IScreenshotDiff = INode & {
  __typename?: 'ScreenshotDiff';
  baseScreenshot?: Maybe<IScreenshot>;
  compareScreenshot?: Maybe<IScreenshot>;
  createdAt: Scalars['DateTime'];
  flakyDetected: Scalars['Boolean'];
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  status: IScreenshotDiffStatus;
  test?: Maybe<ITest>;
  url?: Maybe<Scalars['String']>;
  validationStatus?: Maybe<Scalars['String']>;
  width?: Maybe<Scalars['Int']>;
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

export type ISetTeamMemberLevelInput = {
  level: ITeamUserLevel;
  teamAccountId: Scalars['ID'];
  userAccountId: Scalars['ID'];
};

export type ISetupVercelIntegrationInput = {
  accountId: Scalars['ID'];
  projects: Array<ISetupVercelIntegrationProjectInput>;
  vercelAccessToken: Scalars['String'];
  vercelConfigurationId: Scalars['ID'];
  vercelTeamId?: InputMaybe<Scalars['ID']>;
};

export type ISetupVercelIntegrationProjectInput = {
  projectId: Scalars['ID'];
  vercelProjectId: Scalars['ID'];
};

export type ITeam = IAccount & INode & {
  __typename?: 'Team';
  avatar: IAccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  ghAccount?: Maybe<IGithubAccount>;
  hasForcedPlan: Scalars['Boolean'];
  hasPaidPlan: Scalars['Boolean'];
  id: Scalars['ID'];
  inviteLink: Scalars['String'];
  me: ITeamMember;
  members: ITeamMemberConnection;
  name?: Maybe<Scalars['String']>;
  oldPaidPurchase?: Maybe<IPurchase>;
  paymentProvider?: Maybe<IPurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']>;
  periodEndDate?: Maybe<Scalars['DateTime']>;
  periodStartDate?: Maybe<Scalars['DateTime']>;
  permissions: Array<IPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  purchase?: Maybe<IPurchase>;
  purchaseStatus?: Maybe<IPurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  slug: Scalars['String'];
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  trialStatus?: Maybe<ITrialStatus>;
};


export type ITeamMembersArgs = {
  after?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
};


export type ITeamProjectsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type ITeamMember = INode & {
  __typename?: 'TeamMember';
  id: Scalars['ID'];
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
  buildName: Scalars['String'];
  dailyChanges: Array<IDailyCount>;
  id: Scalars['ID'];
  lastSeen?: Maybe<Scalars['DateTime']>;
  mute: Scalars['Boolean'];
  muteUntil?: Maybe<Scalars['DateTime']>;
  name: Scalars['String'];
  resolvedDate?: Maybe<Scalars['DateTime']>;
  screenshot?: Maybe<IScreenshot>;
  stabilityScore?: Maybe<Scalars['Int']>;
  status: ITestStatus;
  totalBuilds: Scalars['Int'];
  unstable: Scalars['Boolean'];
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
  id: Scalars['ID'];
  name: Scalars['String'];
  targetAccountId: Scalars['ID'];
};

export enum ITrialStatus {
  /** Trial is active */
  Active = 'active',
  /** Subscription ended when trial did */
  Expired = 'expired'
}

export type IUnlinkRepositoryInput = {
  projectId: Scalars['ID'];
};

export type IUpdateAccountInput = {
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  slug?: InputMaybe<Scalars['String']>;
};

export type IUpdateProjectInput = {
  baselineBranch?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  private?: InputMaybe<Scalars['Boolean']>;
};

export type IUpdatedTestStatuses = {
  __typename?: 'UpdatedTestStatuses';
  ids: Array<Scalars['String']>;
  status: ITestStatus;
};

export type IUser = IAccount & INode & {
  __typename?: 'User';
  avatar: IAccountAvatar;
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  ghAccount?: Maybe<IGithubAccount>;
  ghInstallations: IGhApiInstallationConnection;
  hasForcedPlan: Scalars['Boolean'];
  hasPaidPlan: Scalars['Boolean'];
  hasSubscribedToTrial: Scalars['Boolean'];
  id: Scalars['ID'];
  lastPurchase?: Maybe<IPurchase>;
  name?: Maybe<Scalars['String']>;
  oldPaidPurchase?: Maybe<IPurchase>;
  paymentProvider?: Maybe<IPurchaseSource>;
  pendingCancelAt?: Maybe<Scalars['DateTime']>;
  periodEndDate?: Maybe<Scalars['DateTime']>;
  periodStartDate?: Maybe<Scalars['DateTime']>;
  permissions: Array<IPermission>;
  plan?: Maybe<IPlan>;
  projects: IProjectConnection;
  purchase?: Maybe<IPurchase>;
  purchaseStatus?: Maybe<IPurchaseStatus>;
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  slug: Scalars['String'];
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  teams: Array<ITeam>;
  trialStatus?: Maybe<ITrialStatus>;
};


export type IUserProjectsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
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
  count: Scalars['Int'];
  next?: Maybe<Scalars['ID']>;
  prev?: Maybe<Scalars['ID']>;
};

export type IVercelApiProject = {
  __typename?: 'VercelApiProject';
  id: Scalars['ID'];
  link?: Maybe<IVercelApiProjectLink>;
  linkedProject?: Maybe<IProject>;
  name: Scalars['String'];
  status: IVercelApiProjectStatus;
};


export type IVercelApiProjectStatusArgs = {
  accountId: Scalars['ID'];
};

export type IVercelApiProjectConnection = {
  __typename?: 'VercelApiProjectConnection';
  pagination: IVercelApiPagination;
  projects: Array<IVercelApiProject>;
};

export type IVercelApiProjectLink = {
  type: Scalars['String'];
};

export type IVercelApiProjectLinkGithub = IVercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkGithub';
  org: Scalars['String'];
  repo: Scalars['String'];
  repoId: Scalars['Int'];
  type: Scalars['String'];
};

export type IVercelApiProjectLinkOther = IVercelApiProjectLink & {
  __typename?: 'VercelApiProjectLinkOther';
  type: Scalars['String'];
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
  id: Scalars['ID'];
  name: Scalars['String'];
  slug: Scalars['String'];
};

export type IVercelApiToken = {
  __typename?: 'VercelApiToken';
  access_token: Scalars['String'];
  installation_id: Scalars['String'];
  team_id?: Maybe<Scalars['String']>;
  user_id: Scalars['String'];
};

export type IDailyCount = {
  __typename?: 'dailyCount';
  count: Scalars['Int'];
  date: Scalars['Date'];
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



/** Mapping between all available schema types and the resolvers types */
export type IResolversTypes = ResolversObject<{
  Account: IResolversTypes['Team'] | IResolversTypes['User'];
  AccountAvatar: ResolverTypeWrapper<AccountAvatar>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  Build: ResolverTypeWrapper<Build>;
  BuildConnection: ResolverTypeWrapper<Omit<IBuildConnection, 'edges'> & { edges: Array<IResolversTypes['Build']> }>;
  BuildStats: ResolverTypeWrapper<IBuildStats>;
  BuildStatus: IBuildStatus;
  BuildType: IBuildType;
  Connection: IResolversTypes['BuildConnection'] | IResolversTypes['GhApiInstallationConnection'] | IResolversTypes['GhApiRepositoryConnection'] | IResolversTypes['ProjectConnection'] | IResolversTypes['ScreenshotDiffConnection'] | IResolversTypes['TeamMemberConnection'] | IResolversTypes['TestConnection'] | IResolversTypes['UserConnection'];
  CreateProjectInput: ICreateProjectInput;
  CreateTeamInput: ICreateTeamInput;
  Date: ResolverTypeWrapper<Scalars['Date']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']>;
  DeleteTeamInput: IDeleteTeamInput;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  GhApiInstallation: ResolverTypeWrapper<GhApiInstallation>;
  GhApiInstallationAccount: ResolverTypeWrapper<IGhApiInstallationAccount>;
  GhApiInstallationConnection: ResolverTypeWrapper<Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<IResolversTypes['GhApiInstallation']> }>;
  GhApiRepository: ResolverTypeWrapper<GhApiRepository>;
  GhApiRepositoryConnection: ResolverTypeWrapper<Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<IResolversTypes['GhApiRepository']> }>;
  GithubAccount: ResolverTypeWrapper<GithubAccount>;
  GithubRepository: ResolverTypeWrapper<GithubRepository>;
  ID: ResolverTypeWrapper<Scalars['ID']>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  JobStatus: IJobStatus;
  LeaveTeamInput: ILeaveTeamInput;
  LinkRepositoryInput: ILinkRepositoryInput;
  Mutation: ResolverTypeWrapper<{}>;
  MuteUpdateTest: ResolverTypeWrapper<IMuteUpdateTest>;
  Node: IResolversTypes['Build'] | IResolversTypes['GhApiInstallation'] | IResolversTypes['GhApiInstallationAccount'] | IResolversTypes['GhApiRepository'] | IResolversTypes['GithubAccount'] | IResolversTypes['GithubRepository'] | IResolversTypes['Plan'] | IResolversTypes['Project'] | IResolversTypes['Purchase'] | IResolversTypes['Screenshot'] | IResolversTypes['ScreenshotBucket'] | IResolversTypes['ScreenshotDiff'] | IResolversTypes['Team'] | IResolversTypes['TeamMember'] | IResolversTypes['Test'] | IResolversTypes['User'];
  PageInfo: ResolverTypeWrapper<IPageInfo>;
  Permission: IPermission;
  Plan: ResolverTypeWrapper<Plan>;
  Project: ResolverTypeWrapper<Project>;
  ProjectConnection: ResolverTypeWrapper<Omit<IProjectConnection, 'edges'> & { edges: Array<IResolversTypes['Project']> }>;
  Purchase: ResolverTypeWrapper<Purchase>;
  PurchaseSource: IPurchaseSource;
  PurchaseStatus: IPurchaseStatus;
  Query: ResolverTypeWrapper<{}>;
  RemoveUserFromTeamInput: IRemoveUserFromTeamInput;
  RemoveUserFromTeamPayload: ResolverTypeWrapper<IRemoveUserFromTeamPayload>;
  Screenshot: ResolverTypeWrapper<Screenshot>;
  ScreenshotBucket: ResolverTypeWrapper<ScreenshotBucket>;
  ScreenshotDiff: ResolverTypeWrapper<ScreenshotDiff>;
  ScreenshotDiffConnection: ResolverTypeWrapper<Omit<IScreenshotDiffConnection, 'edges'> & { edges: Array<IResolversTypes['ScreenshotDiff']> }>;
  ScreenshotDiffStatus: IScreenshotDiffStatus;
  SetTeamMemberLevelInput: ISetTeamMemberLevelInput;
  SetupVercelIntegrationInput: ISetupVercelIntegrationInput;
  SetupVercelIntegrationProjectInput: ISetupVercelIntegrationProjectInput;
  String: ResolverTypeWrapper<Scalars['String']>;
  Team: ResolverTypeWrapper<Account>;
  TeamMember: ResolverTypeWrapper<TeamUser>;
  TeamMemberConnection: ResolverTypeWrapper<Omit<ITeamMemberConnection, 'edges'> & { edges: Array<IResolversTypes['TeamMember']> }>;
  TeamUserLevel: ITeamUserLevel;
  Test: ResolverTypeWrapper<Test>;
  TestConnection: ResolverTypeWrapper<Omit<ITestConnection, 'edges'> & { edges: Array<IResolversTypes['Test']> }>;
  TestStatus: ITestStatus;
  Time: ResolverTypeWrapper<Scalars['Time']>;
  TransferProjectInput: ITransferProjectInput;
  TrialStatus: ITrialStatus;
  UnlinkRepositoryInput: IUnlinkRepositoryInput;
  UpdateAccountInput: IUpdateAccountInput;
  UpdateProjectInput: IUpdateProjectInput;
  UpdatedTestStatuses: ResolverTypeWrapper<IUpdatedTestStatuses>;
  User: ResolverTypeWrapper<Account>;
  UserConnection: ResolverTypeWrapper<Omit<IUserConnection, 'edges'> & { edges: Array<IResolversTypes['User']> }>;
  ValidationStatus: IValidationStatus;
  VercelApiPagination: ResolverTypeWrapper<IVercelApiPagination>;
  VercelApiProject: ResolverTypeWrapper<VercelProject>;
  VercelApiProjectConnection: ResolverTypeWrapper<Omit<IVercelApiProjectConnection, 'projects'> & { projects: Array<IResolversTypes['VercelApiProject']> }>;
  VercelApiProjectLink: IResolversTypes['VercelApiProjectLinkGithub'] | IResolversTypes['VercelApiProjectLinkOther'];
  VercelApiProjectLinkGithub: ResolverTypeWrapper<IVercelApiProjectLinkGithub>;
  VercelApiProjectLinkOther: ResolverTypeWrapper<IVercelApiProjectLinkOther>;
  VercelApiProjectStatus: IVercelApiProjectStatus;
  VercelApiTeam: ResolverTypeWrapper<VercelTeam>;
  VercelApiToken: ResolverTypeWrapper<IVercelApiToken>;
  dailyCount: ResolverTypeWrapper<IDailyCount>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type IResolversParentTypes = ResolversObject<{
  Account: IResolversParentTypes['Team'] | IResolversParentTypes['User'];
  AccountAvatar: AccountAvatar;
  Boolean: Scalars['Boolean'];
  Build: Build;
  BuildConnection: Omit<IBuildConnection, 'edges'> & { edges: Array<IResolversParentTypes['Build']> };
  BuildStats: IBuildStats;
  Connection: IResolversParentTypes['BuildConnection'] | IResolversParentTypes['GhApiInstallationConnection'] | IResolversParentTypes['GhApiRepositoryConnection'] | IResolversParentTypes['ProjectConnection'] | IResolversParentTypes['ScreenshotDiffConnection'] | IResolversParentTypes['TeamMemberConnection'] | IResolversParentTypes['TestConnection'] | IResolversParentTypes['UserConnection'];
  CreateProjectInput: ICreateProjectInput;
  CreateTeamInput: ICreateTeamInput;
  Date: Scalars['Date'];
  DateTime: Scalars['DateTime'];
  DeleteTeamInput: IDeleteTeamInput;
  Float: Scalars['Float'];
  GhApiInstallation: GhApiInstallation;
  GhApiInstallationAccount: IGhApiInstallationAccount;
  GhApiInstallationConnection: Omit<IGhApiInstallationConnection, 'edges'> & { edges: Array<IResolversParentTypes['GhApiInstallation']> };
  GhApiRepository: GhApiRepository;
  GhApiRepositoryConnection: Omit<IGhApiRepositoryConnection, 'edges'> & { edges: Array<IResolversParentTypes['GhApiRepository']> };
  GithubAccount: GithubAccount;
  GithubRepository: GithubRepository;
  ID: Scalars['ID'];
  Int: Scalars['Int'];
  LeaveTeamInput: ILeaveTeamInput;
  LinkRepositoryInput: ILinkRepositoryInput;
  Mutation: {};
  MuteUpdateTest: IMuteUpdateTest;
  Node: IResolversParentTypes['Build'] | IResolversParentTypes['GhApiInstallation'] | IResolversParentTypes['GhApiInstallationAccount'] | IResolversParentTypes['GhApiRepository'] | IResolversParentTypes['GithubAccount'] | IResolversParentTypes['GithubRepository'] | IResolversParentTypes['Plan'] | IResolversParentTypes['Project'] | IResolversParentTypes['Purchase'] | IResolversParentTypes['Screenshot'] | IResolversParentTypes['ScreenshotBucket'] | IResolversParentTypes['ScreenshotDiff'] | IResolversParentTypes['Team'] | IResolversParentTypes['TeamMember'] | IResolversParentTypes['Test'] | IResolversParentTypes['User'];
  PageInfo: IPageInfo;
  Plan: Plan;
  Project: Project;
  ProjectConnection: Omit<IProjectConnection, 'edges'> & { edges: Array<IResolversParentTypes['Project']> };
  Purchase: Purchase;
  Query: {};
  RemoveUserFromTeamInput: IRemoveUserFromTeamInput;
  RemoveUserFromTeamPayload: IRemoveUserFromTeamPayload;
  Screenshot: Screenshot;
  ScreenshotBucket: ScreenshotBucket;
  ScreenshotDiff: ScreenshotDiff;
  ScreenshotDiffConnection: Omit<IScreenshotDiffConnection, 'edges'> & { edges: Array<IResolversParentTypes['ScreenshotDiff']> };
  SetTeamMemberLevelInput: ISetTeamMemberLevelInput;
  SetupVercelIntegrationInput: ISetupVercelIntegrationInput;
  SetupVercelIntegrationProjectInput: ISetupVercelIntegrationProjectInput;
  String: Scalars['String'];
  Team: Account;
  TeamMember: TeamUser;
  TeamMemberConnection: Omit<ITeamMemberConnection, 'edges'> & { edges: Array<IResolversParentTypes['TeamMember']> };
  Test: Test;
  TestConnection: Omit<ITestConnection, 'edges'> & { edges: Array<IResolversParentTypes['Test']> };
  Time: Scalars['Time'];
  TransferProjectInput: ITransferProjectInput;
  UnlinkRepositoryInput: IUnlinkRepositoryInput;
  UpdateAccountInput: IUpdateAccountInput;
  UpdateProjectInput: IUpdateProjectInput;
  UpdatedTestStatuses: IUpdatedTestStatuses;
  User: Account;
  UserConnection: Omit<IUserConnection, 'edges'> & { edges: Array<IResolversParentTypes['User']> };
  VercelApiPagination: IVercelApiPagination;
  VercelApiProject: VercelProject;
  VercelApiProjectConnection: Omit<IVercelApiProjectConnection, 'projects'> & { projects: Array<IResolversParentTypes['VercelApiProject']> };
  VercelApiProjectLink: IResolversParentTypes['VercelApiProjectLinkGithub'] | IResolversParentTypes['VercelApiProjectLinkOther'];
  VercelApiProjectLinkGithub: IVercelApiProjectLinkGithub;
  VercelApiProjectLinkOther: IVercelApiProjectLinkOther;
  VercelApiTeam: VercelTeam;
  VercelApiToken: IVercelApiToken;
  dailyCount: IDailyCount;
}>;

export type IAccountResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Account'] = IResolversParentTypes['Account']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Team' | 'User', ParentType, ContextType>;
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  consumptionRatio?: Resolver<Maybe<IResolversTypes['Float']>, ParentType, ContextType>;
  currentMonthUsedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ghAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasPaidPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  paymentProvider?: Resolver<Maybe<IResolversTypes['PurchaseSource']>, ParentType, ContextType>;
  pendingCancelAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<IAccountProjectsArgs, 'after' | 'first'>>;
  purchase?: Resolver<Maybe<IResolversTypes['Purchase']>, ParentType, ContextType>;
  purchaseStatus?: Resolver<Maybe<IResolversTypes['PurchaseStatus']>, ParentType, ContextType>;
  screenshotsLimitPerMonth?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  trialStatus?: Resolver<Maybe<IResolversTypes['TrialStatus']>, ParentType, ContextType>;
}>;

export type IAccountAvatarResolvers<ContextType = Context, ParentType extends IResolversParentTypes['AccountAvatar'] = IResolversParentTypes['AccountAvatar']> = ResolversObject<{
  color?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  initial?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType, RequireFields<IAccountAvatarUrlArgs, 'size'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IBuildResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Build'] = IResolversParentTypes['Build']> = ResolversObject<{
  baseScreenshotBucket?: Resolver<Maybe<IResolversTypes['ScreenshotBucket']>, ParentType, ContextType>;
  batchCount?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  compareScreenshotBucket?: Resolver<IResolversTypes['ScreenshotBucket'], ParentType, ContextType>;
  createdAt?: Resolver<IResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  number?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  prNumber?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
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
  __resolveType: TypeResolveFn<'BuildConnection' | 'GhApiInstallationConnection' | 'GhApiRepositoryConnection' | 'ProjectConnection' | 'ScreenshotDiffConnection' | 'TeamMemberConnection' | 'TestConnection' | 'UserConnection', ParentType, ContextType>;
  edges?: Resolver<Array<IResolversTypes['Node']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
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
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IGithubRepositoryResolvers<ContextType = Context, ParentType extends IResolversParentTypes['GithubRepository'] = IResolversParentTypes['GithubRepository']> = ResolversObject<{
  defaultBranch?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  fullName?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  private?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IMutationResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Mutation'] = IResolversParentTypes['Mutation']> = ResolversObject<{
  acceptInvitation?: Resolver<IResolversTypes['Team'], ParentType, ContextType, RequireFields<IMutationAcceptInvitationArgs, 'token'>>;
  createProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationCreateProjectArgs, 'input'>>;
  createTeam?: Resolver<IResolversTypes['Team'], ParentType, ContextType, RequireFields<IMutationCreateTeamArgs, 'input'>>;
  deleteProject?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationDeleteProjectArgs, 'id'>>;
  deleteTeam?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationDeleteTeamArgs, 'input'>>;
  leaveTeam?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType, RequireFields<IMutationLeaveTeamArgs, 'input'>>;
  linkRepository?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationLinkRepositoryArgs, 'input'>>;
  muteTests?: Resolver<IResolversTypes['MuteUpdateTest'], ParentType, ContextType, RequireFields<IMutationMuteTestsArgs, 'ids' | 'muted'>>;
  ping?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  removeUserFromTeam?: Resolver<IResolversTypes['RemoveUserFromTeamPayload'], ParentType, ContextType, RequireFields<IMutationRemoveUserFromTeamArgs, 'input'>>;
  retrieveVercelToken?: Resolver<IResolversTypes['VercelApiToken'], ParentType, ContextType, RequireFields<IMutationRetrieveVercelTokenArgs, 'code'>>;
  setTeamMemberLevel?: Resolver<IResolversTypes['TeamMember'], ParentType, ContextType, RequireFields<IMutationSetTeamMemberLevelArgs, 'input'>>;
  setValidationStatus?: Resolver<IResolversTypes['Build'], ParentType, ContextType, RequireFields<IMutationSetValidationStatusArgs, 'buildId' | 'validationStatus'>>;
  setupVercelIntegration?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<IMutationSetupVercelIntegrationArgs, 'input'>>;
  terminateTrial?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationTerminateTrialArgs, 'accountId'>>;
  transferProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationTransferProjectArgs, 'input'>>;
  unlinkRepository?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUnlinkRepositoryArgs, 'input'>>;
  updateAccount?: Resolver<IResolversTypes['Account'], ParentType, ContextType, RequireFields<IMutationUpdateAccountArgs, 'input'>>;
  updateProject?: Resolver<IResolversTypes['Project'], ParentType, ContextType, RequireFields<IMutationUpdateProjectArgs, 'input'>>;
  updateTestStatuses?: Resolver<IResolversTypes['UpdatedTestStatuses'], ParentType, ContextType, RequireFields<IMutationUpdateTestStatusesArgs, 'ids' | 'status'>>;
}>;

export type IMuteUpdateTestResolvers<ContextType = Context, ParentType extends IResolversParentTypes['MuteUpdateTest'] = IResolversParentTypes['MuteUpdateTest']> = ResolversObject<{
  ids?: Resolver<Array<IResolversTypes['String']>, ParentType, ContextType>;
  mute?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  muteUntil?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type INodeResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Node'] = IResolversParentTypes['Node']> = ResolversObject<{
  __resolveType: TypeResolveFn<'Build' | 'GhApiInstallation' | 'GhApiInstallationAccount' | 'GhApiRepository' | 'GithubAccount' | 'GithubRepository' | 'Plan' | 'Project' | 'Purchase' | 'Screenshot' | 'ScreenshotBucket' | 'ScreenshotDiff' | 'Team' | 'TeamMember' | 'Test' | 'User', ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
}>;

export type IPageInfoResolvers<ContextType = Context, ParentType extends IResolversParentTypes['PageInfo'] = IResolversParentTypes['PageInfo']> = ResolversObject<{
  hasNextPage?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  totalCount?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IPlanResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Plan'] = IResolversParentTypes['Plan']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  screenshotsLimitPerMonth?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Project'] = IResolversParentTypes['Project']> = ResolversObject<{
  account?: Resolver<IResolversTypes['Account'], ParentType, ContextType>;
  baselineBranch?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  build?: Resolver<Maybe<IResolversTypes['Build']>, ParentType, ContextType, RequireFields<IProjectBuildArgs, 'number'>>;
  builds?: Resolver<IResolversTypes['BuildConnection'], ParentType, ContextType, RequireFields<IProjectBuildsArgs, 'after' | 'first'>>;
  currentMonthUsedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ghRepository?: Resolver<Maybe<IResolversTypes['GithubRepository']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  private?: Resolver<Maybe<IResolversTypes['Boolean']>, ParentType, ContextType>;
  public?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  referenceBranch?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  tests?: Resolver<IResolversTypes['TestConnection'], ParentType, ContextType, RequireFields<IProjectTestsArgs, 'after' | 'first'>>;
  token?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  totalScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IProjectConnectionResolvers<ContextType = Context, ParentType extends IResolversParentTypes['ProjectConnection'] = IResolversParentTypes['ProjectConnection']> = ResolversObject<{
  edges?: Resolver<Array<IResolversTypes['Project']>, ParentType, ContextType>;
  pageInfo?: Resolver<IResolversTypes['PageInfo'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IPurchaseResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Purchase'] = IResolversParentTypes['Purchase']> = ResolversObject<{
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  paymentMethodFilled?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  source?: Resolver<IResolversTypes['PurchaseSource'], ParentType, ContextType>;
  trialDaysRemaining?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IQueryResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Query'] = IResolversParentTypes['Query']> = ResolversObject<{
  account?: Resolver<Maybe<IResolversTypes['Account']>, ParentType, ContextType, RequireFields<IQueryAccountArgs, 'slug'>>;
  accountById?: Resolver<Maybe<IResolversTypes['Account']>, ParentType, ContextType, RequireFields<IQueryAccountByIdArgs, 'id'>>;
  ghApiInstallationRepositories?: Resolver<IResolversTypes['GhApiRepositoryConnection'], ParentType, ContextType, RequireFields<IQueryGhApiInstallationRepositoriesArgs, 'installationId' | 'page'>>;
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

export type IScreenshotResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Screenshot'] = IResolversParentTypes['Screenshot']> = ResolversObject<{
  height?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
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

export type ITeamResolvers<ContextType = Context, ParentType extends IResolversParentTypes['Team'] = IResolversParentTypes['Team']> = ResolversObject<{
  avatar?: Resolver<IResolversTypes['AccountAvatar'], ParentType, ContextType>;
  consumptionRatio?: Resolver<Maybe<IResolversTypes['Float']>, ParentType, ContextType>;
  currentMonthUsedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ghAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasPaidPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  inviteLink?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  me?: Resolver<IResolversTypes['TeamMember'], ParentType, ContextType>;
  members?: Resolver<IResolversTypes['TeamMemberConnection'], ParentType, ContextType, RequireFields<ITeamMembersArgs, 'after' | 'first'>>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  oldPaidPurchase?: Resolver<Maybe<IResolversTypes['Purchase']>, ParentType, ContextType>;
  paymentProvider?: Resolver<Maybe<IResolversTypes['PurchaseSource']>, ParentType, ContextType>;
  pendingCancelAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<ITeamProjectsArgs, 'after' | 'first'>>;
  purchase?: Resolver<Maybe<IResolversTypes['Purchase']>, ParentType, ContextType>;
  purchaseStatus?: Resolver<Maybe<IResolversTypes['PurchaseStatus']>, ParentType, ContextType>;
  screenshotsLimitPerMonth?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  trialStatus?: Resolver<Maybe<IResolversTypes['TrialStatus']>, ParentType, ContextType>;
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
  consumptionRatio?: Resolver<Maybe<IResolversTypes['Float']>, ParentType, ContextType>;
  currentMonthUsedScreenshots?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  ghAccount?: Resolver<Maybe<IResolversTypes['GithubAccount']>, ParentType, ContextType>;
  ghInstallations?: Resolver<IResolversTypes['GhApiInstallationConnection'], ParentType, ContextType>;
  hasForcedPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasPaidPlan?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  hasSubscribedToTrial?: Resolver<IResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<IResolversTypes['ID'], ParentType, ContextType>;
  lastPurchase?: Resolver<Maybe<IResolversTypes['Purchase']>, ParentType, ContextType>;
  name?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  oldPaidPurchase?: Resolver<Maybe<IResolversTypes['Purchase']>, ParentType, ContextType>;
  paymentProvider?: Resolver<Maybe<IResolversTypes['PurchaseSource']>, ParentType, ContextType>;
  pendingCancelAt?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodEndDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  periodStartDate?: Resolver<Maybe<IResolversTypes['DateTime']>, ParentType, ContextType>;
  permissions?: Resolver<Array<IResolversTypes['Permission']>, ParentType, ContextType>;
  plan?: Resolver<Maybe<IResolversTypes['Plan']>, ParentType, ContextType>;
  projects?: Resolver<IResolversTypes['ProjectConnection'], ParentType, ContextType, RequireFields<IUserProjectsArgs, 'after' | 'first'>>;
  purchase?: Resolver<Maybe<IResolversTypes['Purchase']>, ParentType, ContextType>;
  purchaseStatus?: Resolver<Maybe<IResolversTypes['PurchaseStatus']>, ParentType, ContextType>;
  screenshotsLimitPerMonth?: Resolver<Maybe<IResolversTypes['Int']>, ParentType, ContextType>;
  slug?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeClientReferenceId?: Resolver<IResolversTypes['String'], ParentType, ContextType>;
  stripeCustomerId?: Resolver<Maybe<IResolversTypes['String']>, ParentType, ContextType>;
  teams?: Resolver<Array<IResolversTypes['Team']>, ParentType, ContextType>;
  trialStatus?: Resolver<Maybe<IResolversTypes['TrialStatus']>, ParentType, ContextType>;
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

export type IDailyCountResolvers<ContextType = Context, ParentType extends IResolversParentTypes['dailyCount'] = IResolversParentTypes['dailyCount']> = ResolversObject<{
  count?: Resolver<IResolversTypes['Int'], ParentType, ContextType>;
  date?: Resolver<IResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IResolvers<ContextType = Context> = ResolversObject<{
  Account?: IAccountResolvers<ContextType>;
  AccountAvatar?: IAccountAvatarResolvers<ContextType>;
  Build?: IBuildResolvers<ContextType>;
  BuildConnection?: IBuildConnectionResolvers<ContextType>;
  BuildStats?: IBuildStatsResolvers<ContextType>;
  Connection?: IConnectionResolvers<ContextType>;
  Date?: GraphQLScalarType;
  DateTime?: GraphQLScalarType;
  GhApiInstallation?: IGhApiInstallationResolvers<ContextType>;
  GhApiInstallationAccount?: IGhApiInstallationAccountResolvers<ContextType>;
  GhApiInstallationConnection?: IGhApiInstallationConnectionResolvers<ContextType>;
  GhApiRepository?: IGhApiRepositoryResolvers<ContextType>;
  GhApiRepositoryConnection?: IGhApiRepositoryConnectionResolvers<ContextType>;
  GithubAccount?: IGithubAccountResolvers<ContextType>;
  GithubRepository?: IGithubRepositoryResolvers<ContextType>;
  Mutation?: IMutationResolvers<ContextType>;
  MuteUpdateTest?: IMuteUpdateTestResolvers<ContextType>;
  Node?: INodeResolvers<ContextType>;
  PageInfo?: IPageInfoResolvers<ContextType>;
  Plan?: IPlanResolvers<ContextType>;
  Project?: IProjectResolvers<ContextType>;
  ProjectConnection?: IProjectConnectionResolvers<ContextType>;
  Purchase?: IPurchaseResolvers<ContextType>;
  Query?: IQueryResolvers<ContextType>;
  RemoveUserFromTeamPayload?: IRemoveUserFromTeamPayloadResolvers<ContextType>;
  Screenshot?: IScreenshotResolvers<ContextType>;
  ScreenshotBucket?: IScreenshotBucketResolvers<ContextType>;
  ScreenshotDiff?: IScreenshotDiffResolvers<ContextType>;
  ScreenshotDiffConnection?: IScreenshotDiffConnectionResolvers<ContextType>;
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
  dailyCount?: IDailyCountResolvers<ContextType>;
}>;

