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
  /** A date string, such as 2007-12-03, compliant with the `full-date` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  Date: any;
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: any;
  /** A time string at UTC, such as 10:15:30Z, compliant with the `full-time` format outlined in section 5.6 of the RFC 3339profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  Time: any;
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

export type Installation = Node & {
  __typename?: 'Installation';
  id: Scalars['ID'];
  latestSynchronization?: Maybe<Synchronization>;
};

export enum JobStatus {
  Aborted = 'aborted',
  Complete = 'complete',
  Error = 'error',
  Pending = 'pending',
  Progress = 'progress'
}

export type Mutation = {
  __typename?: 'Mutation';
  ping: Scalars['Boolean'];
  /** Change the validationStatus on a build */
  setValidationStatus: Build;
  /** Update repository baseline branch */
  updateReferenceBranch: Repository;
};


export type MutationSetValidationStatusArgs = {
  buildId: Scalars['ID'];
  validationStatus: ValidationStatus;
};


export type MutationUpdateReferenceBranchArgs = {
  baselineBranch?: InputMaybe<Scalars['String']>;
  repositoryId: Scalars['String'];
};

export type Node = {
  id: Scalars['ID'];
};

export type Organization = Node & Owner & {
  __typename?: 'Organization';
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  id: Scalars['ID'];
  login: Scalars['String'];
  name: Scalars['String'];
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  purchase?: Maybe<Purchase>;
  repositories: Array<Repository>;
  repositoriesNumber: Scalars['Int'];
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  type: OwnerType;
};


export type OrganizationRepositoriesArgs = {
  enabled?: InputMaybe<Scalars['Boolean']>;
};

export type Owner = {
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  id: Scalars['ID'];
  login: Scalars['String'];
  name: Scalars['String'];
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  purchase?: Maybe<Purchase>;
  repositories: Array<Repository>;
  repositoriesNumber: Scalars['Int'];
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  type: OwnerType;
};


export type OwnerRepositoriesArgs = {
  enabled?: InputMaybe<Scalars['Boolean']>;
};

export enum OwnerType {
  Organization = 'organization',
  User = 'user'
}

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
  name?: Maybe<Scalars['String']>;
  screenshotsLimitPerMonth: Scalars['Int'];
};

export type Purchase = Node & {
  __typename?: 'Purchase';
  id: Scalars['ID'];
  owner: Owner;
  source?: Maybe<PurchaseSource>;
};

export enum PurchaseSource {
  Github = 'github',
  Stripe = 'stripe'
}

export type Query = {
  __typename?: 'Query';
  /** Get owner */
  owner?: Maybe<Owner>;
  /** Get owners */
  owners: Array<Owner>;
  ping: Scalars['Boolean'];
  /** Get a repository */
  repository?: Maybe<Repository>;
  /** Get the authenticated user */
  user?: Maybe<User>;
};


export type QueryOwnerArgs = {
  login: Scalars['String'];
};


export type QueryRepositoryArgs = {
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
};

export type Repository = Node & {
  __typename?: 'Repository';
  /** Override branch name */
  baselineBranch?: Maybe<Scalars['String']>;
  /** A single build linked to the repository */
  build?: Maybe<Build>;
  /** Builds associated to the repository */
  builds: BuildConnection;
  /** Current month used screenshots */
  currentMonthUsedScreenshots: Scalars['Int'];
  /** Github default branch */
  defaultBranch?: Maybe<Scalars['String']>;
  enabled: Scalars['Boolean'];
  id: Scalars['ID'];
  name: Scalars['String'];
  /** Owner of the repository */
  owner: Owner;
  /** Determine if the current user has write access to the repository */
  permissions: Array<Permission>;
  /** Private repository on GitHub */
  private: Scalars['Boolean'];
  /** Reference branch */
  referenceBranch?: Maybe<Scalars['String']>;
  token?: Maybe<Scalars['ID']>;
};


export type RepositoryBuildArgs = {
  number: Scalars['Int'];
};


export type RepositoryBuildsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
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
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  status: ScreenshotDiffStatus;
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

export type Synchronization = Node & {
  __typename?: 'Synchronization';
  id: Scalars['ID'];
  jobStatus: JobStatus;
};

export type User = Node & Owner & {
  __typename?: 'User';
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  email?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  installations: Array<Installation>;
  lastPurchase?: Maybe<Purchase>;
  latestSynchronization?: Maybe<Synchronization>;
  login: Scalars['String'];
  name: Scalars['String'];
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  privateSync: Scalars['Boolean'];
  purchase?: Maybe<Purchase>;
  repositories: Array<Repository>;
  repositoriesNumber: Scalars['Int'];
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
  stripeClientReferenceId: Scalars['String'];
  stripeCustomerId?: Maybe<Scalars['String']>;
  type: OwnerType;
};


export type UserRepositoriesArgs = {
  enabled?: InputMaybe<Scalars['Boolean']>;
};

export enum ValidationStatus {
  Accepted = 'accepted',
  Rejected = 'rejected',
  Unknown = 'unknown'
}

export type OwnerBreadcrumb_OwnerQueryVariables = Exact<{
  login: Scalars['String'];
}>;


export type OwnerBreadcrumb_OwnerQuery = { __typename?: 'Query', owner?: { __typename?: 'Organization', id: string, login: string, name: string } | { __typename?: 'User', id: string, login: string, name: string } | null };

export type OwnerBreadcrumbMenu_OwnersQueryVariables = Exact<{ [key: string]: never; }>;


export type OwnerBreadcrumbMenu_OwnersQuery = { __typename?: 'Query', owners: Array<{ __typename?: 'Organization', id: string, login: string, name: string } | { __typename?: 'User', id: string, login: string, name: string }> };

export type RepositoryBreadcrumbMenu_OwnerQueryVariables = Exact<{
  login: Scalars['String'];
}>;


export type RepositoryBreadcrumbMenu_OwnerQuery = { __typename?: 'Query', owner?: { __typename?: 'Organization', id: string, repositories: Array<{ __typename?: 'Repository', id: string, name: string }> } | { __typename?: 'User', id: string, repositories: Array<{ __typename?: 'Repository', id: string, name: string }> } | null };

export type BuildStatusChip_BuildFragment = (
  { __typename?: 'Build', type?: BuildType | null, status: BuildStatus }
  & { ' $fragmentRefs'?: { 'BuildStatusDescription_BuildFragment': BuildStatusDescription_BuildFragment } }
) & { ' $fragmentName'?: 'BuildStatusChip_BuildFragment' };

export type BuildStatusChip_RepositoryFragment = (
  { __typename?: 'Repository' }
  & { ' $fragmentRefs'?: { 'BuildStatusDescription_RepositoryFragment': BuildStatusDescription_RepositoryFragment } }
) & { ' $fragmentName'?: 'BuildStatusChip_RepositoryFragment' };

export type BuildStatusDescription_BuildFragment = { __typename?: 'Build', type?: BuildType | null, status: BuildStatus, batchCount?: number | null, totalBatch?: number | null, stats: { __typename?: 'BuildStats', total: number } } & { ' $fragmentName'?: 'BuildStatusDescription_BuildFragment' };

export type BuildStatusDescription_RepositoryFragment = { __typename?: 'Repository', referenceBranch?: string | null } & { ' $fragmentName'?: 'BuildStatusDescription_RepositoryFragment' };

export type RepositoryList_RepositoryFragment = { __typename?: 'Repository', id: string, name: string, enabled: boolean, owner: { __typename?: 'Organization', id: string, login: string, name: string } | { __typename?: 'User', id: string, login: string, name: string }, builds: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number } } } & { ' $fragmentName'?: 'RepositoryList_RepositoryFragment' };

export type ReviewButton_RepositoryFragment = { __typename?: 'Repository', name: string, permissions: Array<Permission>, private: boolean, owner: { __typename?: 'Organization', login: string, consumptionRatio?: number | null } | { __typename?: 'User', login: string, consumptionRatio?: number | null }, build?: { __typename?: 'Build', id: string, status: BuildStatus } | null } & { ' $fragmentName'?: 'ReviewButton_RepositoryFragment' };

export type SetValidationStatusMutationVariables = Exact<{
  buildId: Scalars['ID'];
  validationStatus: ValidationStatus;
}>;


export type SetValidationStatusMutation = { __typename?: 'Mutation', setValidationStatus: { __typename?: 'Build', id: string, status: BuildStatus } };

export type SyncAlert_UserQueryVariables = Exact<{ [key: string]: never; }>;


export type SyncAlert_UserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, login: string, latestSynchronization?: { __typename?: 'Synchronization', id: string, jobStatus: JobStatus } | null } | null };

export type BuildDetail_BuildFragment = { __typename?: 'Build', stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', branch: string, createdAt: any } | null, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', branch: string, createdAt: any } } & { ' $fragmentName'?: 'BuildDetail_BuildFragment' };

export type BuildDiffState_RepositoryQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
  buildNumber: Scalars['Int'];
  after: Scalars['Int'];
  first: Scalars['Int'];
}>;


export type BuildDiffState_RepositoryQuery = { __typename?: 'Query', repository?: { __typename?: 'Repository', id: string, build?: { __typename?: 'Build', id: string, screenshotDiffs: { __typename?: 'ScreenshotDiffConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, edges: Array<{ __typename?: 'ScreenshotDiff', id: string, status: ScreenshotDiffStatus, url?: string | null, name: string, width?: number | null, height?: number | null, baseScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null } | null, compareScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null } | null }> } } | null } | null };

export type BuildHeader_BuildFragment = (
  { __typename?: 'Build', name: string }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
) & { ' $fragmentName'?: 'BuildHeader_BuildFragment' };

export type BuildHeader_RepositoryFragment = (
  { __typename?: 'Repository' }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_RepositoryFragment': BuildStatusChip_RepositoryFragment;'ReviewButton_RepositoryFragment': ReviewButton_RepositoryFragment } }
) & { ' $fragmentName'?: 'BuildHeader_RepositoryFragment' };

export type BuildInfos_BuildFragment = { __typename?: 'Build', createdAt: any, name: string, stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', commit: string, branch: string } | null, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', commit: string, branch: string } } & { ' $fragmentName'?: 'BuildInfos_BuildFragment' };

export type BuildQueryQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
  buildNumber: Scalars['Int'];
}>;


export type BuildQueryQuery = { __typename?: 'Query', repository?: (
    { __typename?: 'Repository', id: string, owner: (
      { __typename?: 'Organization', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Owner_Organization_Fragment': OvercapacityBanner_Owner_Organization_Fragment } }
    ) | (
      { __typename?: 'User', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Owner_User_Fragment': OvercapacityBanner_Owner_User_Fragment } }
    ), build?: (
      { __typename?: 'Build', id: string, status: BuildStatus }
      & { ' $fragmentRefs'?: { 'BuildHeader_BuildFragment': BuildHeader_BuildFragment;'BuildWorkspace_BuildFragment': BuildWorkspace_BuildFragment } }
    ) | null }
    & { ' $fragmentRefs'?: { 'BuildHeader_RepositoryFragment': BuildHeader_RepositoryFragment;'BuildWorkspace_RepositoryFragment': BuildWorkspace_RepositoryFragment } }
  ) | null };

export type BuildSidebar_BuildFragment = (
  { __typename?: 'Build', stats: { __typename?: 'BuildStats', total: number } }
  & { ' $fragmentRefs'?: { 'BuildInfos_BuildFragment': BuildInfos_BuildFragment } }
) & { ' $fragmentName'?: 'BuildSidebar_BuildFragment' };

export type BuildWorkspace_BuildFragment = (
  { __typename?: 'Build', status: BuildStatus, stats: { __typename?: 'BuildStats', total: number, failure: number, changed: number, added: number, removed: number, unchanged: number } }
  & { ' $fragmentRefs'?: { 'BuildSidebar_BuildFragment': BuildSidebar_BuildFragment;'BuildStatusDescription_BuildFragment': BuildStatusDescription_BuildFragment;'BuildDetail_BuildFragment': BuildDetail_BuildFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_BuildFragment' };

export type BuildWorkspace_RepositoryFragment = (
  { __typename?: 'Repository' }
  & { ' $fragmentRefs'?: { 'BuildStatusDescription_RepositoryFragment': BuildStatusDescription_RepositoryFragment } }
) & { ' $fragmentName'?: 'BuildWorkspace_RepositoryFragment' };

type OvercapacityBanner_Owner_Organization_Fragment = { __typename?: 'Organization', consumptionRatio?: number | null, plan?: { __typename?: 'Plan', name?: string | null } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Owner_Organization_Fragment' };

type OvercapacityBanner_Owner_User_Fragment = { __typename?: 'User', consumptionRatio?: number | null, plan?: { __typename?: 'Plan', name?: string | null } | null } & { ' $fragmentName'?: 'OvercapacityBanner_Owner_User_Fragment' };

export type OvercapacityBanner_OwnerFragment = OvercapacityBanner_Owner_Organization_Fragment | OvercapacityBanner_Owner_User_Fragment;

export type Checkout_SuccessQueryVariables = Exact<{ [key: string]: never; }>;


export type Checkout_SuccessQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, lastPurchase?: { __typename?: 'Purchase', id: string, owner: { __typename?: 'Organization', id: string, login: string } | { __typename?: 'User', id: string, login: string } } | null } | null };

export type Home_OwnersQueryVariables = Exact<{ [key: string]: never; }>;


export type Home_OwnersQuery = { __typename?: 'Query', owners: Array<{ __typename?: 'Organization', id: string, repositories: Array<(
      { __typename?: 'Repository', id: string, enabled: boolean }
      & { ' $fragmentRefs'?: { 'RepositoryList_RepositoryFragment': RepositoryList_RepositoryFragment } }
    )> } | { __typename?: 'User', id: string, repositories: Array<(
      { __typename?: 'Repository', id: string, enabled: boolean }
      & { ' $fragmentRefs'?: { 'RepositoryList_RepositoryFragment': RepositoryList_RepositoryFragment } }
    )> }> };

export type OwnerCheckout_OwnerQueryVariables = Exact<{
  login: Scalars['String'];
}>;


export type OwnerCheckout_OwnerQuery = { __typename?: 'Query', owner?: { __typename?: 'Organization', id: string, stripeClientReferenceId: string, purchase?: { __typename?: 'Purchase', id: string, source?: PurchaseSource | null } | null } | { __typename?: 'User', id: string, stripeClientReferenceId: string, purchase?: { __typename?: 'Purchase', id: string, source?: PurchaseSource | null } | null } | null };

export type OwnerSettings_OwnerQueryVariables = Exact<{
  login: Scalars['String'];
}>;


export type OwnerSettings_OwnerQuery = { __typename?: 'Query', owner?: { __typename?: 'Organization', id: string, name: string, screenshotsLimitPerMonth?: number | null, type: OwnerType, stripeCustomerId?: string | null, plan?: { __typename?: 'Plan', id: string, name?: string | null, screenshotsLimitPerMonth: number } | null, purchase?: { __typename?: 'Purchase', id: string, source?: PurchaseSource | null } | null, repositories: Array<{ __typename?: 'Repository', id: string, name: string, private: boolean, currentMonthUsedScreenshots: number }> } | { __typename?: 'User', id: string, name: string, screenshotsLimitPerMonth?: number | null, type: OwnerType, stripeCustomerId?: string | null, plan?: { __typename?: 'Plan', id: string, name?: string | null, screenshotsLimitPerMonth: number } | null, purchase?: { __typename?: 'Purchase', id: string, source?: PurchaseSource | null } | null, repositories: Array<{ __typename?: 'Repository', id: string, name: string, private: boolean, currentMonthUsedScreenshots: number }> } | null };

export type OwnerRepositories_OwnerQueryVariables = Exact<{
  login: Scalars['String'];
}>;


export type OwnerRepositories_OwnerQuery = { __typename?: 'Query', owner?: { __typename?: 'Organization', id: string, repositories: Array<(
      { __typename?: 'Repository', id: string }
      & { ' $fragmentRefs'?: { 'RepositoryList_RepositoryFragment': RepositoryList_RepositoryFragment } }
    )> } | { __typename?: 'User', id: string, repositories: Array<(
      { __typename?: 'Repository', id: string }
      & { ' $fragmentRefs'?: { 'RepositoryList_RepositoryFragment': RepositoryList_RepositoryFragment } }
    )> } | null };

export type Owner_OwnerQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
}>;


export type Owner_OwnerQuery = { __typename?: 'Query', owner?: { __typename?: 'Organization', id: string, permissions: Array<Permission> } | { __typename?: 'User', id: string, permissions: Array<Permission> } | null };

export type GettingStarted_RepositoryFragment = { __typename?: 'Repository', token?: string | null } & { ' $fragmentName'?: 'GettingStarted_RepositoryFragment' };

export type RepositoryBuilds_RepositoryQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
}>;


export type RepositoryBuilds_RepositoryQuery = { __typename?: 'Query', repository?: (
    { __typename?: 'Repository', id: string, permissions: Array<Permission> }
    & { ' $fragmentRefs'?: { 'GettingStarted_RepositoryFragment': GettingStarted_RepositoryFragment;'BuildStatusChip_RepositoryFragment': BuildStatusChip_RepositoryFragment } }
  ) | null };

export type RepositoryBuilds_Repository_BuildsQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
  after: Scalars['Int'];
  first: Scalars['Int'];
}>;


export type RepositoryBuilds_Repository_BuildsQuery = { __typename?: 'Query', repository?: { __typename?: 'Repository', id: string, builds: { __typename?: 'BuildConnection', pageInfo: { __typename?: 'PageInfo', totalCount: number, hasNextPage: boolean }, edges: Array<(
        { __typename?: 'Build', id: string, number: number, createdAt: any, name: string, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', id: string, branch: string, commit: string } }
        & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
      )> } } | null };

export type RepositorySettings_RepositoryQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
}>;


export type RepositorySettings_RepositoryQuery = { __typename?: 'Query', repository?: { __typename?: 'Repository', id: string, token?: string | null, baselineBranch?: string | null, defaultBranch?: string | null } | null };

export type RepositorySettings_UpdateReferenceBranchMutationVariables = Exact<{
  repositoryId: Scalars['String'];
  baselineBranch?: InputMaybe<Scalars['String']>;
}>;


export type RepositorySettings_UpdateReferenceBranchMutation = { __typename?: 'Mutation', updateReferenceBranch: { __typename?: 'Repository', id: string, baselineBranch?: string | null, defaultBranch?: string | null } };

export type Repository_RepositoryQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
}>;


export type Repository_RepositoryQuery = { __typename?: 'Query', repository?: { __typename?: 'Repository', id: string, permissions: Array<Permission> } | null };

export const RepositoryList_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryList_repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"IntValue","value":"0"}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"IntValue","value":"0"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]} as unknown as DocumentNode<RepositoryList_RepositoryFragment, unknown>;
export const BuildStatusDescription_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<BuildStatusDescription_BuildFragment, unknown>;
export const BuildStatusChip_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<BuildStatusChip_BuildFragment, unknown>;
export const BuildHeader_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}}]} as unknown as DocumentNode<BuildHeader_BuildFragment, unknown>;
export const BuildStatusDescription_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildStatusDescription_RepositoryFragment, unknown>;
export const BuildStatusChip_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Repository"}}]}}]} as unknown as DocumentNode<BuildStatusChip_RepositoryFragment, unknown>;
export const ReviewButton_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ReviewButton_RepositoryFragment, unknown>;
export const BuildHeader_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Repository"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewButton_Repository"}}]}}]} as unknown as DocumentNode<BuildHeader_RepositoryFragment, unknown>;
export const BuildInfos_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}}]}}]}}]} as unknown as DocumentNode<BuildInfos_BuildFragment, unknown>;
export const BuildSidebar_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<BuildSidebar_BuildFragment, unknown>;
export const BuildDetail_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BuildDetail_BuildFragment, unknown>;
export const BuildWorkspace_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"failure"}},{"kind":"Field","name":{"kind":"Name","value":"changed"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"removed"}},{"kind":"Field","name":{"kind":"Name","value":"unchanged"}}]}}]}}]} as unknown as DocumentNode<BuildWorkspace_BuildFragment, unknown>;
export const BuildWorkspace_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Repository"}}]}}]} as unknown as DocumentNode<BuildWorkspace_RepositoryFragment, unknown>;
export const OvercapacityBanner_OwnerFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Owner"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Owner"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}}]} as unknown as DocumentNode<OvercapacityBanner_OwnerFragment, unknown>;
export const GettingStarted_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"GettingStarted_repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}}]}}]} as unknown as DocumentNode<GettingStarted_RepositoryFragment, unknown>;
export const OwnerBreadcrumb_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnerBreadcrumb_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<OwnerBreadcrumb_OwnerQuery, OwnerBreadcrumb_OwnerQueryVariables>;
export const OwnerBreadcrumbMenu_OwnersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnerBreadcrumbMenu_owners"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owners"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<OwnerBreadcrumbMenu_OwnersQuery, OwnerBreadcrumbMenu_OwnersQueryVariables>;
export const RepositoryBreadcrumbMenu_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepositoryBreadcrumbMenu_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"enabled"},"value":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<RepositoryBreadcrumbMenu_OwnerQuery, RepositoryBreadcrumbMenu_OwnerQueryVariables>;
export const SetValidationStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"setValidationStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setValidationStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"buildId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}}},{"kind":"Argument","name":{"kind":"Name","value":"validationStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SetValidationStatusMutation, SetValidationStatusMutationVariables>;
export const SyncAlert_UserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SyncAlert_user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"latestSynchronization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"jobStatus"}}]}}]}}]}}]} as unknown as DocumentNode<SyncAlert_UserQuery, SyncAlert_UserQueryVariables>;
export const BuildDiffState_RepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildDiffState_repository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotDiffs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<BuildDiffState_RepositoryQuery, BuildDiffState_RepositoryQueryVariables>;
export const BuildQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildQuery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Repository"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Repository"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"OvercapacityBanner_Owner"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Build"}}]}}]}}]}},...BuildHeader_RepositoryFragmentDoc.definitions,...BuildStatusChip_RepositoryFragmentDoc.definitions,...BuildStatusDescription_RepositoryFragmentDoc.definitions,...ReviewButton_RepositoryFragmentDoc.definitions,...BuildWorkspace_RepositoryFragmentDoc.definitions,...OvercapacityBanner_OwnerFragmentDoc.definitions,...BuildHeader_BuildFragmentDoc.definitions,...BuildStatusChip_BuildFragmentDoc.definitions,...BuildStatusDescription_BuildFragmentDoc.definitions,...BuildWorkspace_BuildFragmentDoc.definitions,...BuildSidebar_BuildFragmentDoc.definitions,...BuildInfos_BuildFragmentDoc.definitions,...BuildDetail_BuildFragmentDoc.definitions]} as unknown as DocumentNode<BuildQueryQuery, BuildQueryQueryVariables>;
export const Checkout_SuccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Checkout_success"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"lastPurchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}}]}}]}}]} as unknown as DocumentNode<Checkout_SuccessQuery, Checkout_SuccessQueryVariables>;
export const Home_OwnersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Home_owners"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owners"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryList_repository"}}]}}]}}]}},...RepositoryList_RepositoryFragmentDoc.definitions]} as unknown as DocumentNode<Home_OwnersQuery, Home_OwnersQueryVariables>;
export const OwnerCheckout_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnerCheckout_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"stripeClientReferenceId"}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"source"}}]}}]}}]}}]} as unknown as DocumentNode<OwnerCheckout_OwnerQuery, OwnerCheckout_OwnerQueryVariables>;
export const OwnerSettings_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnerSettings_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotsLimitPerMonth"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"stripeCustomerId"}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotsLimitPerMonth"}}]}},{"kind":"Field","name":{"kind":"Name","value":"purchase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"source"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"currentMonthUsedScreenshots"}}]}}]}}]}}]} as unknown as DocumentNode<OwnerSettings_OwnerQuery, OwnerSettings_OwnerQueryVariables>;
export const OwnerRepositories_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnerRepositories_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryList_repository"}}]}}]}}]}},...RepositoryList_RepositoryFragmentDoc.definitions]} as unknown as DocumentNode<OwnerRepositories_OwnerQuery, OwnerRepositories_OwnerQueryVariables>;
export const Owner_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Owner_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]} as unknown as DocumentNode<Owner_OwnerQuery, Owner_OwnerQueryVariables>;
export const RepositoryBuilds_RepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepositoryBuilds_repository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"GettingStarted_repository"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Repository"}}]}}]}},...GettingStarted_RepositoryFragmentDoc.definitions,...BuildStatusChip_RepositoryFragmentDoc.definitions,...BuildStatusDescription_RepositoryFragmentDoc.definitions]} as unknown as DocumentNode<RepositoryBuilds_RepositoryQuery, RepositoryBuilds_RepositoryQueryVariables>;
export const RepositoryBuilds_Repository_BuildsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepositoryBuilds_repository_builds"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"builds"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}}]}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}}]}}]}}]}},...BuildStatusChip_BuildFragmentDoc.definitions,...BuildStatusDescription_BuildFragmentDoc.definitions]} as unknown as DocumentNode<RepositoryBuilds_Repository_BuildsQuery, RepositoryBuilds_Repository_BuildsQueryVariables>;
export const RepositorySettings_RepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepositorySettings_repository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}}]} as unknown as DocumentNode<RepositorySettings_RepositoryQuery, RepositorySettings_RepositoryQueryVariables>;
export const RepositorySettings_UpdateReferenceBranchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RepositorySettings_updateReferenceBranch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"baselineBranch"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateReferenceBranch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"repositoryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryId"}}},{"kind":"Argument","name":{"kind":"Name","value":"baselineBranch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"baselineBranch"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"baselineBranch"}},{"kind":"Field","name":{"kind":"Name","value":"defaultBranch"}}]}}]}}]} as unknown as DocumentNode<RepositorySettings_UpdateReferenceBranchMutation, RepositorySettings_UpdateReferenceBranchMutationVariables>;
export const Repository_RepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Repository_repository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}}]}}]}}]} as unknown as DocumentNode<Repository_RepositoryQuery, Repository_RepositoryQueryVariables>;