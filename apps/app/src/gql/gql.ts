/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\n  query OwnerBreadcrumb_owner($login: String!) {\n    owner(login: $login) {\n      id\n      login\n      name\n    }\n  }\n": types.OwnerBreadcrumb_OwnerDocument,
    "\n  query OwnerBreadcrumbMenu_owners {\n    owners {\n      id\n      login\n      name\n    }\n  }\n": types.OwnerBreadcrumbMenu_OwnersDocument,
    "\n  query RepositoryBreadcrumbMenu_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories(enabled: true) {\n        id\n        name\n      }\n    }\n  }\n": types.RepositoryBreadcrumbMenu_OwnerDocument,
    "\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n": types.BuildStatusChip_BuildFragmentDoc,
    "\n  fragment BuildStatusChip_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n": types.BuildStatusChip_RepositoryFragmentDoc,
    "\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total\n    }\n  }\n": types.BuildStatusDescription_BuildFragmentDoc,
    "\n  fragment BuildStatusDescription_Repository on Repository {\n    referenceBranch\n  }\n": types.BuildStatusDescription_RepositoryFragmentDoc,
    "\n  fragment RepositoryList_repository on Repository {\n    id\n    name\n    enabled\n    owner {\n      id\n      login\n      name\n    }\n    builds(first: 0, after: 0) {\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n": types.RepositoryList_RepositoryFragmentDoc,
    "\n  fragment ReviewButton_Repository on Repository {\n    name\n    permissions\n    private\n    forcedPrivate\n    owner {\n      login\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n": types.ReviewButton_RepositoryFragmentDoc,
    "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n": types.SetValidationStatusDocument,
    "\n  query SyncAlert_user {\n    user {\n      id\n      login\n      latestSynchronization {\n        id\n        jobStatus\n      }\n    }\n  }\n": types.SyncAlert_UserDocument,
    "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n": types.BuildDetail_BuildFragmentDoc,
    "\n  query BuildDiffState_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            flakyDetected\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n            test {\n              id\n              status\n              unstable\n              resolvedDate\n              mute\n              muteUntil\n            }\n          }\n        }\n      }\n    }\n  }\n": types.BuildDiffState_RepositoryDocument,
    "\n  fragment BuildHeader_Build on Build {\n    name\n    ...BuildStatusChip_Build\n  }\n": types.BuildHeader_BuildFragmentDoc,
    "\n  fragment BuildHeader_Repository on Repository {\n    ...BuildStatusChip_Repository\n    ...ReviewButton_Repository\n  }\n": types.BuildHeader_RepositoryFragmentDoc,
    "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    prNumber\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    compareScreenshotBucket {\n      commit\n      branch\n    }\n  }\n": types.BuildInfos_BuildFragmentDoc,
    "\n  query BuildQuery(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      ...BuildHeader_Repository\n      ...BuildWorkspace_Repository\n      owner {\n        id\n        ...OvercapacityBanner_Owner\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n": types.BuildQueryDocument,
    "\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total\n    }\n  }\n": types.BuildSidebar_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    stats {\n      total\n      failure\n      changed\n      added\n      removed\n      unchanged\n    }\n  }\n": types.BuildWorkspace_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n": types.BuildWorkspace_RepositoryFragmentDoc,
    "\n  fragment OvercapacityBanner_Owner on Owner {\n    plan {\n      name\n    }\n    consumptionRatio\n  }\n": types.OvercapacityBanner_OwnerFragmentDoc,
    "\n  query Checkout_success {\n    user {\n      id\n      lastPurchase {\n        id\n        owner {\n          id\n          login\n        }\n      }\n    }\n  }\n": types.Checkout_SuccessDocument,
    "\n  query Home_owners {\n    owners {\n      id\n      repositories {\n        id\n        enabled\n        ...RepositoryList_repository\n      }\n    }\n  }\n": types.Home_OwnersDocument,
    "\n  query OwnerCheckout_owner($login: String!) {\n    owner(login: $login) {\n      id\n      stripeClientReferenceId\n\n      purchase {\n        id\n        source\n      }\n    }\n  }\n": types.OwnerCheckout_OwnerDocument,
    "\n  query OwnerSettings_owner($login: String!) {\n    owner(login: $login) {\n      id\n      name\n      screenshotsLimitPerMonth\n      type\n      stripeCustomerId\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      purchase {\n        id\n        source\n      }\n\n      repositories {\n        id\n        name\n        private\n        forcedPrivate\n        currentMonthUsedScreenshots\n      }\n    }\n  }\n": types.OwnerSettings_OwnerDocument,
    "\n  query OwnerRepositories_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories {\n        id\n        ...RepositoryList_repository\n      }\n    }\n  }\n": types.OwnerRepositories_OwnerDocument,
    "\n  query Owner_owner($ownerLogin: String!) {\n    owner(login: $ownerLogin) {\n      id\n      permissions\n    }\n  }\n": types.Owner_OwnerDocument,
    "\n  fragment GettingStarted_repository on Repository {\n    token\n  }\n": types.GettingStarted_RepositoryFragmentDoc,
    "\n  query RepositoryBuilds_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n      ...GettingStarted_repository\n      ...BuildStatusChip_Repository\n    }\n  }\n": types.RepositoryBuilds_RepositoryDocument,
    "\n  query RepositoryBuilds_repository_builds(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      builds(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          compareScreenshotBucket {\n            id\n            branch\n            commit\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n": types.RepositoryBuilds_Repository_BuildsDocument,
    "\n  query RepositorySettings_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      token\n      baselineBranch\n      defaultBranch\n      private\n      forcedPrivate\n    }\n  }\n": types.RepositorySettings_RepositoryDocument,
    "\n  mutation RepositorySettings_updateReferenceBranch(\n    $repositoryId: String!\n    $baselineBranch: String\n  ) {\n    updateReferenceBranch(\n      repositoryId: $repositoryId\n      baselineBranch: $baselineBranch\n    ) {\n      id\n      baselineBranch\n      defaultBranch\n    }\n  }\n": types.RepositorySettings_UpdateReferenceBranchDocument,
    "\n  mutation RepositorySettings_UpdateForcedPrivate(\n    $repositoryId: String!\n    $forcedPrivate: Boolean!\n  ) {\n    updateForcedPrivate(\n      repositoryId: $repositoryId\n      forcedPrivate: $forcedPrivate\n    ) {\n      id\n      forcedPrivate\n    }\n  }\n": types.RepositorySettings_UpdateForcedPrivateDocument,
    "\n  query FlakyTests_repository_tests(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      tests(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          name\n          buildName\n          status\n          resolvedDate\n          mute\n          muteUntil\n          stabilityScore\n          lastSeen\n          unstable\n          dailyChanges {\n            date\n            count\n          }\n          totalBuilds\n          screenshot {\n            id\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n": types.FlakyTests_Repository_TestsDocument,
    "\n  mutation muteTests($ids: [String!]!, $muted: Boolean!, $muteUntil: String) {\n    muteTests(ids: $ids, muted: $muted, muteUntil: $muteUntil) {\n      ids\n      mute\n      muteUntil\n    }\n  }\n": types.MuteTestsDocument,
    "\n  mutation updateStatusesMutation($ids: [String!]!, $status: TestStatus!) {\n    updateTestStatuses(ids: $ids, status: $status) {\n      ids\n      status\n    }\n  }\n": types.UpdateStatusesMutationDocument,
    "\n  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n    }\n  }\n": types.Repository_RepositoryDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OwnerBreadcrumb_owner($login: String!) {\n    owner(login: $login) {\n      id\n      login\n      name\n    }\n  }\n"): (typeof documents)["\n  query OwnerBreadcrumb_owner($login: String!) {\n    owner(login: $login) {\n      id\n      login\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OwnerBreadcrumbMenu_owners {\n    owners {\n      id\n      login\n      name\n    }\n  }\n"): (typeof documents)["\n  query OwnerBreadcrumbMenu_owners {\n    owners {\n      id\n      login\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RepositoryBreadcrumbMenu_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories(enabled: true) {\n        id\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  query RepositoryBreadcrumbMenu_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories(enabled: true) {\n        id\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n"): (typeof documents)["\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusChip_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n"): (typeof documents)["\n  fragment BuildStatusChip_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total\n    }\n  }\n"): (typeof documents)["\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusDescription_Repository on Repository {\n    referenceBranch\n  }\n"): (typeof documents)["\n  fragment BuildStatusDescription_Repository on Repository {\n    referenceBranch\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment RepositoryList_repository on Repository {\n    id\n    name\n    enabled\n    owner {\n      id\n      login\n      name\n    }\n    builds(first: 0, after: 0) {\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment RepositoryList_repository on Repository {\n    id\n    name\n    enabled\n    owner {\n      id\n      login\n      name\n    }\n    builds(first: 0, after: 0) {\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ReviewButton_Repository on Repository {\n    name\n    permissions\n    private\n    forcedPrivate\n    owner {\n      login\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  fragment ReviewButton_Repository on Repository {\n    name\n    permissions\n    private\n    forcedPrivate\n    owner {\n      login\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SyncAlert_user {\n    user {\n      id\n      login\n      latestSynchronization {\n        id\n        jobStatus\n      }\n    }\n  }\n"): (typeof documents)["\n  query SyncAlert_user {\n    user {\n      id\n      login\n      latestSynchronization {\n        id\n        jobStatus\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildDiffState_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            flakyDetected\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n            test {\n              id\n              status\n              unstable\n              resolvedDate\n              mute\n              muteUntil\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildDiffState_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            flakyDetected\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n            test {\n              id\n              status\n              unstable\n              resolvedDate\n              mute\n              muteUntil\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Build on Build {\n    name\n    ...BuildStatusChip_Build\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Build on Build {\n    name\n    ...BuildStatusChip_Build\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Repository on Repository {\n    ...BuildStatusChip_Repository\n    ...ReviewButton_Repository\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Repository on Repository {\n    ...BuildStatusChip_Repository\n    ...ReviewButton_Repository\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    prNumber\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    compareScreenshotBucket {\n      commit\n      branch\n    }\n  }\n"): (typeof documents)["\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    prNumber\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    compareScreenshotBucket {\n      commit\n      branch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildQuery(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      ...BuildHeader_Repository\n      ...BuildWorkspace_Repository\n      owner {\n        id\n        ...OvercapacityBanner_Owner\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildQuery(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      ...BuildHeader_Repository\n      ...BuildWorkspace_Repository\n      owner {\n        id\n        ...OvercapacityBanner_Owner\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total\n    }\n  }\n"): (typeof documents)["\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    stats {\n      total\n      failure\n      changed\n      added\n      removed\n      unchanged\n    }\n  }\n"): (typeof documents)["\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    stats {\n      total\n      failure\n      changed\n      added\n      removed\n      unchanged\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildWorkspace_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n"): (typeof documents)["\n  fragment BuildWorkspace_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment OvercapacityBanner_Owner on Owner {\n    plan {\n      name\n    }\n    consumptionRatio\n  }\n"): (typeof documents)["\n  fragment OvercapacityBanner_Owner on Owner {\n    plan {\n      name\n    }\n    consumptionRatio\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Checkout_success {\n    user {\n      id\n      lastPurchase {\n        id\n        owner {\n          id\n          login\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Checkout_success {\n    user {\n      id\n      lastPurchase {\n        id\n        owner {\n          id\n          login\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Home_owners {\n    owners {\n      id\n      repositories {\n        id\n        enabled\n        ...RepositoryList_repository\n      }\n    }\n  }\n"): (typeof documents)["\n  query Home_owners {\n    owners {\n      id\n      repositories {\n        id\n        enabled\n        ...RepositoryList_repository\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OwnerCheckout_owner($login: String!) {\n    owner(login: $login) {\n      id\n      stripeClientReferenceId\n\n      purchase {\n        id\n        source\n      }\n    }\n  }\n"): (typeof documents)["\n  query OwnerCheckout_owner($login: String!) {\n    owner(login: $login) {\n      id\n      stripeClientReferenceId\n\n      purchase {\n        id\n        source\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OwnerSettings_owner($login: String!) {\n    owner(login: $login) {\n      id\n      name\n      screenshotsLimitPerMonth\n      type\n      stripeCustomerId\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      purchase {\n        id\n        source\n      }\n\n      repositories {\n        id\n        name\n        private\n        forcedPrivate\n        currentMonthUsedScreenshots\n      }\n    }\n  }\n"): (typeof documents)["\n  query OwnerSettings_owner($login: String!) {\n    owner(login: $login) {\n      id\n      name\n      screenshotsLimitPerMonth\n      type\n      stripeCustomerId\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      purchase {\n        id\n        source\n      }\n\n      repositories {\n        id\n        name\n        private\n        forcedPrivate\n        currentMonthUsedScreenshots\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OwnerRepositories_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories {\n        id\n        ...RepositoryList_repository\n      }\n    }\n  }\n"): (typeof documents)["\n  query OwnerRepositories_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories {\n        id\n        ...RepositoryList_repository\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Owner_owner($ownerLogin: String!) {\n    owner(login: $ownerLogin) {\n      id\n      permissions\n    }\n  }\n"): (typeof documents)["\n  query Owner_owner($ownerLogin: String!) {\n    owner(login: $ownerLogin) {\n      id\n      permissions\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment GettingStarted_repository on Repository {\n    token\n  }\n"): (typeof documents)["\n  fragment GettingStarted_repository on Repository {\n    token\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RepositoryBuilds_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n      ...GettingStarted_repository\n      ...BuildStatusChip_Repository\n    }\n  }\n"): (typeof documents)["\n  query RepositoryBuilds_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n      ...GettingStarted_repository\n      ...BuildStatusChip_Repository\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RepositoryBuilds_repository_builds(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      builds(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          compareScreenshotBucket {\n            id\n            branch\n            commit\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query RepositoryBuilds_repository_builds(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      builds(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          compareScreenshotBucket {\n            id\n            branch\n            commit\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RepositorySettings_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      token\n      baselineBranch\n      defaultBranch\n      private\n      forcedPrivate\n    }\n  }\n"): (typeof documents)["\n  query RepositorySettings_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      token\n      baselineBranch\n      defaultBranch\n      private\n      forcedPrivate\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RepositorySettings_updateReferenceBranch(\n    $repositoryId: String!\n    $baselineBranch: String\n  ) {\n    updateReferenceBranch(\n      repositoryId: $repositoryId\n      baselineBranch: $baselineBranch\n    ) {\n      id\n      baselineBranch\n      defaultBranch\n    }\n  }\n"): (typeof documents)["\n  mutation RepositorySettings_updateReferenceBranch(\n    $repositoryId: String!\n    $baselineBranch: String\n  ) {\n    updateReferenceBranch(\n      repositoryId: $repositoryId\n      baselineBranch: $baselineBranch\n    ) {\n      id\n      baselineBranch\n      defaultBranch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RepositorySettings_UpdateForcedPrivate(\n    $repositoryId: String!\n    $forcedPrivate: Boolean!\n  ) {\n    updateForcedPrivate(\n      repositoryId: $repositoryId\n      forcedPrivate: $forcedPrivate\n    ) {\n      id\n      forcedPrivate\n    }\n  }\n"): (typeof documents)["\n  mutation RepositorySettings_UpdateForcedPrivate(\n    $repositoryId: String!\n    $forcedPrivate: Boolean!\n  ) {\n    updateForcedPrivate(\n      repositoryId: $repositoryId\n      forcedPrivate: $forcedPrivate\n    ) {\n      id\n      forcedPrivate\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FlakyTests_repository_tests(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      tests(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          name\n          buildName\n          status\n          resolvedDate\n          mute\n          muteUntil\n          stabilityScore\n          lastSeen\n          unstable\n          dailyChanges {\n            date\n            count\n          }\n          totalBuilds\n          screenshot {\n            id\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query FlakyTests_repository_tests(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      tests(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          name\n          buildName\n          status\n          resolvedDate\n          mute\n          muteUntil\n          stabilityScore\n          lastSeen\n          unstable\n          dailyChanges {\n            date\n            count\n          }\n          totalBuilds\n          screenshot {\n            id\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation muteTests($ids: [String!]!, $muted: Boolean!, $muteUntil: String) {\n    muteTests(ids: $ids, muted: $muted, muteUntil: $muteUntil) {\n      ids\n      mute\n      muteUntil\n    }\n  }\n"): (typeof documents)["\n  mutation muteTests($ids: [String!]!, $muted: Boolean!, $muteUntil: String) {\n    muteTests(ids: $ids, muted: $muted, muteUntil: $muteUntil) {\n      ids\n      mute\n      muteUntil\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateStatusesMutation($ids: [String!]!, $status: TestStatus!) {\n    updateTestStatuses(ids: $ids, status: $status) {\n      ids\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation updateStatusesMutation($ids: [String!]!, $status: TestStatus!) {\n    updateTestStatuses(ids: $ids, status: $status) {\n      ids\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n    }\n  }\n"): (typeof documents)["\n  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;