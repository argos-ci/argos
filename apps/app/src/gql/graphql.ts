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

export type Build = {
  __typename?: 'Build';
  /** The screenshot bucket of the baselineBranch */
  baseScreenshotBucket?: Maybe<ScreenshotBucket>;
  /** The screenshot bucket ID of the baselineBranch */
  baseScreenshotBucketId?: Maybe<Scalars['ID']>;
  /** Received batch count  */
  batchCount?: Maybe<Scalars['Int']>;
  /** The screenshot bucket of the build commit */
  compareScreenshotBucket: ScreenshotBucket;
  /** The screenshot bucket ID of the build commit */
  compareScreenshotBucketId: Scalars['ID'];
  /** Merge build type and status */
  compositeStatus: Scalars['String'];
  createdAt: Scalars['DateTime'];
  diffs: ScreenshotDiffResult;
  id: Scalars['ID'];
  /** Build name */
  name: Scalars['String'];
  /** Continuous number. It is incremented after each build */
  number: Scalars['Int'];
  /** The repository associated to the build */
  repository: Repository;
  /** The screenshot diffs before and after the input rank */
  screenshotDiffCursorPaginated: ScreenshotDiffResult;
  /** The screenshot diffs between the base screenshot bucket of the compare screenshot bucket */
  screenshotDiffs: ScreenshotDiffResult;
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


export type BuildDiffsArgs = {
  limit: Scalars['Int'];
  offset: Scalars['Int'];
};


export type BuildScreenshotDiffCursorPaginatedArgs = {
  limit: Scalars['Int'];
  rank: Scalars['Int'];
};


export type BuildScreenshotDiffsArgs = {
  limit: Scalars['Int'];
  offset: Scalars['Int'];
  where?: InputMaybe<ScreenshotDiffWhere>;
};

export type BuildResult = {
  __typename?: 'BuildResult';
  edges: Array<Build>;
  pageInfo: PageInfo;
};

export type BuildStats = {
  __typename?: 'BuildStats';
  addedScreenshotCount: Scalars['Int'];
  failedScreenshotCount: Scalars['Int'];
  removedScreenshotCount: Scalars['Int'];
  screenshotCount: Scalars['Int'];
  stableScreenshotCount: Scalars['Int'];
  updatedScreenshotCount: Scalars['Int'];
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

export type Installation = {
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

export type Organization = Owner & {
  __typename?: 'Organization';
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  id: Scalars['ID'];
  login: Scalars['String'];
  name: Scalars['String'];
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  repositories: Array<Repository>;
  repositoriesNumber: Scalars['Int'];
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
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
  repositories: Array<Repository>;
  repositoriesNumber: Scalars['Int'];
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
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
  endCursor: Scalars['Int'];
  hasNextPage: Scalars['Boolean'];
  totalCount: Scalars['Int'];
};

export enum Permission {
  Read = 'read',
  Write = 'write'
}

export type Plan = {
  __typename?: 'Plan';
  githubId: Scalars['ID'];
  id: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  screenshotsLimitPerMonth: Scalars['Int'];
};

export type Purchase = {
  __typename?: 'Purchase';
  endDate?: Maybe<Scalars['DateTime']>;
  id: Scalars['ID'];
  plan: Plan;
  startDate: Scalars['DateTime'];
};

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

export type Repository = {
  __typename?: 'Repository';
  /** Override branch name */
  baselineBranch?: Maybe<Scalars['String']>;
  /** A single build linked to the repository */
  build?: Maybe<Build>;
  /** Builds associated to the repository */
  builds: BuildResult;
  createdAt: Scalars['DateTime'];
  /** Current month used screenshots */
  currentMonthUsedScreenshots: Scalars['Int'];
  /** Github default branch */
  defaultBranch?: Maybe<Scalars['String']>;
  enabled: Scalars['Boolean'];
  githubId: Scalars['ID'];
  id: Scalars['ID'];
  name: Scalars['String'];
  organizationId: Scalars['ID'];
  /** Owner of the repository */
  owner?: Maybe<Owner>;
  /** Determine if the current user has write access to the repository */
  permissions: Array<Permission>;
  /** Private repository on GitHub */
  private: Scalars['Boolean'];
  /** Reference branch */
  referenceBranch?: Maybe<Scalars['String']>;
  sampleBuildId?: Maybe<Scalars['ID']>;
  token?: Maybe<Scalars['ID']>;
  updatedAt: Scalars['DateTime'];
};


export type RepositoryBuildArgs = {
  number: Scalars['Int'];
};


export type RepositoryBuildsArgs = {
  after: Scalars['Int'];
  first: Scalars['Int'];
};

export type Screenshot = {
  __typename?: 'Screenshot';
  createdAt: Scalars['DateTime'];
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  name: Scalars['String'];
  updatedAt: Scalars['DateTime'];
  url: Scalars['String'];
  width?: Maybe<Scalars['Int']>;
};

export type ScreenshotBucket = {
  __typename?: 'ScreenshotBucket';
  branch: Scalars['String'];
  commit: Scalars['String'];
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  name: Scalars['String'];
  updatedAt: Scalars['DateTime'];
};

export type ScreenshotDiff = {
  __typename?: 'ScreenshotDiff';
  baseScreenshot?: Maybe<Screenshot>;
  baseScreenshotId?: Maybe<Scalars['ID']>;
  buildId: Scalars['ID'];
  compareScreenshot?: Maybe<Screenshot>;
  compareScreenshotId?: Maybe<Scalars['ID']>;
  createdAt: Scalars['DateTime'];
  height?: Maybe<Scalars['Int']>;
  id: Scalars['ID'];
  /** Represent the state of the job generating the diffs */
  jobStatus?: Maybe<JobStatus>;
  name: Scalars['String'];
  rank?: Maybe<Scalars['Int']>;
  score?: Maybe<Scalars['Float']>;
  status: ScreenshotDiffStatus;
  updatedAt: Scalars['DateTime'];
  url?: Maybe<Scalars['String']>;
  /** Represent the status given by the user */
  validationStatus: ValidationStatus;
  width?: Maybe<Scalars['Int']>;
};

export type ScreenshotDiffResult = {
  __typename?: 'ScreenshotDiffResult';
  edges: Array<ScreenshotDiff>;
  pageInfo: PageInfo;
};

export enum ScreenshotDiffStatus {
  Added = 'added',
  Failed = 'failed',
  Removed = 'removed',
  Stable = 'stable',
  Updated = 'updated'
}

export type ScreenshotDiffWhere = {
  passing?: InputMaybe<Scalars['Boolean']>;
};

export type Synchronization = {
  __typename?: 'Synchronization';
  id: Scalars['ID'];
  jobStatus: JobStatus;
  type: Scalars['String'];
};

export type User = Owner & {
  __typename?: 'User';
  consumptionRatio?: Maybe<Scalars['Float']>;
  currentMonthUsedScreenshots: Scalars['Int'];
  email?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  installations: Array<Installation>;
  latestSynchronization?: Maybe<Synchronization>;
  login: Scalars['String'];
  name: Scalars['String'];
  permissions: Array<Permission>;
  plan?: Maybe<Plan>;
  privateSync: Scalars['Boolean'];
  repositories: Array<Repository>;
  repositoriesNumber: Scalars['Int'];
  screenshotsLimitPerMonth?: Maybe<Scalars['Int']>;
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

export type UserQueryVariables = Exact<{ [key: string]: never; }>;


export type UserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, email?: string | null, name: string, login: string, privateSync: boolean, latestSynchronization?: { __typename?: 'Synchronization', id: string, jobStatus: JobStatus } | null, installations: Array<{ __typename?: 'Installation', id: string, latestSynchronization?: { __typename?: 'Synchronization', id: string, jobStatus: JobStatus } | null }> } | null };

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

export type ReviewButton_RepositoryFragment = { __typename?: 'Repository', name: string, permissions: Array<Permission>, private: boolean, owner?: { __typename?: 'Organization', login: string, consumptionRatio?: number | null } | { __typename?: 'User', login: string, consumptionRatio?: number | null } | null, build?: { __typename?: 'Build', id: string, status: BuildStatus } | null } & { ' $fragmentName'?: 'ReviewButton_RepositoryFragment' };

export type SetValidationStatusMutationVariables = Exact<{
  buildId: Scalars['ID'];
  validationStatus: ValidationStatus;
}>;


export type SetValidationStatusMutation = { __typename?: 'Mutation', setValidationStatus: { __typename?: 'Build', id: string, status: BuildStatus } };

export type BuildDetail_BuildFragment = { __typename?: 'Build', stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', branch: string, createdAt: any } | null, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', branch: string, createdAt: any } } & { ' $fragmentName'?: 'BuildDetail_BuildFragment' };

export type BuildDiffState_RepositoryQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
  buildNumber: Scalars['Int'];
  offset: Scalars['Int'];
  limit: Scalars['Int'];
}>;


export type BuildDiffState_RepositoryQuery = { __typename?: 'Query', repository?: { __typename?: 'Repository', id: string, build?: { __typename?: 'Build', id: string, screenshotDiffs: { __typename?: 'ScreenshotDiffResult', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean }, edges: Array<{ __typename?: 'ScreenshotDiff', id: string, status: ScreenshotDiffStatus, url?: string | null, name: string, width?: number | null, height?: number | null, baseScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null } | null, compareScreenshot?: { __typename?: 'Screenshot', id: string, url: string, width?: number | null, height?: number | null } | null }> } } | null } | null };

export type BuildHeader_BuildFragment = (
  { __typename?: 'Build' }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_BuildFragment': BuildStatusChip_BuildFragment } }
) & { ' $fragmentName'?: 'BuildHeader_BuildFragment' };

export type BuildHeader_RepositoryFragment = (
  { __typename?: 'Repository' }
  & { ' $fragmentRefs'?: { 'BuildStatusChip_RepositoryFragment': BuildStatusChip_RepositoryFragment;'ReviewButton_RepositoryFragment': ReviewButton_RepositoryFragment } }
) & { ' $fragmentName'?: 'BuildHeader_RepositoryFragment' };

export type BuildInfos_BuildFragment = { __typename?: 'Build', createdAt: any, stats: { __typename?: 'BuildStats', total: number }, baseScreenshotBucket?: { __typename?: 'ScreenshotBucket', commit: string } | null, compareScreenshotBucket: { __typename?: 'ScreenshotBucket', commit: string } } & { ' $fragmentName'?: 'BuildInfos_BuildFragment' };

export type BuildQueryQueryVariables = Exact<{
  ownerLogin: Scalars['String'];
  repositoryName: Scalars['String'];
  buildNumber: Scalars['Int'];
}>;


export type BuildQueryQuery = { __typename?: 'Query', repository?: (
    { __typename?: 'Repository', id: string, owner?: (
      { __typename?: 'Organization', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Owner_Organization_Fragment': OvercapacityBanner_Owner_Organization_Fragment } }
    ) | (
      { __typename?: 'User', id: string }
      & { ' $fragmentRefs'?: { 'OvercapacityBanner_Owner_User_Fragment': OvercapacityBanner_Owner_User_Fragment } }
    ) | null, build?: (
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

export const BuildStatusDescription_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"batchCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalBatch"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"total"},"name":{"kind":"Name","value":"screenshotCount"}}]}}]}}]} as unknown as DocumentNode<BuildStatusDescription_BuildFragment, unknown>;
export const BuildStatusChip_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]} as unknown as DocumentNode<BuildStatusChip_BuildFragment, unknown>;
export const BuildHeader_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Build"}}]}}]} as unknown as DocumentNode<BuildHeader_BuildFragment, unknown>;
export const BuildStatusDescription_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusDescription_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"referenceBranch"}}]}}]} as unknown as DocumentNode<BuildStatusDescription_RepositoryFragment, unknown>;
export const BuildStatusChip_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildStatusChip_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Repository"}}]}}]} as unknown as DocumentNode<BuildStatusChip_RepositoryFragment, unknown>;
export const ReviewButton_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReviewButton_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ReviewButton_RepositoryFragment, unknown>;
export const BuildHeader_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildHeader_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusChip_Repository"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReviewButton_Repository"}}]}}]} as unknown as DocumentNode<BuildHeader_RepositoryFragment, unknown>;
export const BuildInfos_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildInfos_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"total"},"name":{"kind":"Name","value":"screenshotCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commit"}}]}}]}}]} as unknown as DocumentNode<BuildInfos_BuildFragment, unknown>;
export const BuildSidebar_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildSidebar_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildInfos_Build"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"total"},"name":{"kind":"Name","value":"screenshotCount"}}]}}]}}]} as unknown as DocumentNode<BuildSidebar_BuildFragment, unknown>;
export const BuildDetail_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildDetail_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"total"},"name":{"kind":"Name","value":"screenshotCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshotBucket"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"branch"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<BuildDetail_BuildFragment, unknown>;
export const BuildWorkspace_BuildFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Build"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Build"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildSidebar_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildDetail_Build"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"total"},"name":{"kind":"Name","value":"screenshotCount"}},{"kind":"Field","alias":{"kind":"Name","value":"failure"},"name":{"kind":"Name","value":"failedScreenshotCount"}},{"kind":"Field","alias":{"kind":"Name","value":"changed"},"name":{"kind":"Name","value":"updatedScreenshotCount"}},{"kind":"Field","alias":{"kind":"Name","value":"added"},"name":{"kind":"Name","value":"addedScreenshotCount"}},{"kind":"Field","alias":{"kind":"Name","value":"removed"},"name":{"kind":"Name","value":"removedScreenshotCount"}},{"kind":"Field","alias":{"kind":"Name","value":"unchanged"},"name":{"kind":"Name","value":"stableScreenshotCount"}}]}}]}}]} as unknown as DocumentNode<BuildWorkspace_BuildFragment, unknown>;
export const BuildWorkspace_RepositoryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BuildWorkspace_Repository"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildStatusDescription_Repository"}}]}}]} as unknown as DocumentNode<BuildWorkspace_RepositoryFragment, unknown>;
export const OvercapacityBanner_OwnerFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OvercapacityBanner_Owner"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Owner"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"consumptionRatio"}}]}}]} as unknown as DocumentNode<OvercapacityBanner_OwnerFragment, unknown>;
export const UserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"User"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"privateSync"}},{"kind":"Field","name":{"kind":"Name","value":"latestSynchronization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"jobStatus"}}]}},{"kind":"Field","name":{"kind":"Name","value":"installations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"latestSynchronization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"jobStatus"}}]}}]}}]}}]}}]} as unknown as DocumentNode<UserQuery, UserQueryVariables>;
export const OwnerBreadcrumb_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnerBreadcrumb_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<OwnerBreadcrumb_OwnerQuery, OwnerBreadcrumb_OwnerQueryVariables>;
export const OwnerBreadcrumbMenu_OwnersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OwnerBreadcrumbMenu_owners"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owners"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<OwnerBreadcrumbMenu_OwnersQuery, OwnerBreadcrumbMenu_OwnersQueryVariables>;
export const RepositoryBreadcrumbMenu_OwnerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepositoryBreadcrumbMenu_owner"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"owner"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"enabled"},"value":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<RepositoryBreadcrumbMenu_OwnerQuery, RepositoryBreadcrumbMenu_OwnerQueryVariables>;
export const SetValidationStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"setValidationStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ValidationStatus"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setValidationStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"buildId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildId"}}},{"kind":"Argument","name":{"kind":"Name","value":"validationStatus"},"value":{"kind":"Variable","name":{"kind":"Name","value":"validationStatus"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<SetValidationStatusMutation, SetValidationStatusMutationVariables>;
export const BuildDiffState_RepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildDiffState_repository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"screenshotDiffs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}}]}},{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"baseScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}},{"kind":"Field","name":{"kind":"Name","value":"compareScreenshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}}]}}]}}]}}]}}]}}]}}]} as unknown as DocumentNode<BuildDiffState_RepositoryQuery, BuildDiffState_RepositoryQueryVariables>;
export const BuildQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BuildQuery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ownerLogin"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ownerLogin"}}},{"kind":"Argument","name":{"kind":"Name","value":"repositoryName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"repositoryName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Repository"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Repository"}},{"kind":"Field","name":{"kind":"Name","value":"owner"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"OvercapacityBanner_Owner"}}]}},{"kind":"Field","name":{"kind":"Name","value":"build"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"number"},"value":{"kind":"Variable","name":{"kind":"Name","value":"buildNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildHeader_Build"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"BuildWorkspace_Build"}}]}}]}}]}},...BuildHeader_RepositoryFragmentDoc.definitions,...BuildStatusChip_RepositoryFragmentDoc.definitions,...BuildStatusDescription_RepositoryFragmentDoc.definitions,...ReviewButton_RepositoryFragmentDoc.definitions,...BuildWorkspace_RepositoryFragmentDoc.definitions,...OvercapacityBanner_OwnerFragmentDoc.definitions,...BuildHeader_BuildFragmentDoc.definitions,...BuildStatusChip_BuildFragmentDoc.definitions,...BuildStatusDescription_BuildFragmentDoc.definitions,...BuildWorkspace_BuildFragmentDoc.definitions,...BuildSidebar_BuildFragmentDoc.definitions,...BuildInfos_BuildFragmentDoc.definitions,...BuildDetail_BuildFragmentDoc.definitions]} as unknown as DocumentNode<BuildQueryQuery, BuildQueryQueryVariables>;