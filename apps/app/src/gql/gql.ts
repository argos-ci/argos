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
 * Therefore it is highly recommended to use the babel-plugin for production.
 */
const documents = {
    "\n  query User {\n    user {\n      id\n      email\n      name\n      login\n      privateSync\n      latestSynchronization {\n        id\n        jobStatus\n      }\n      installations {\n        id\n        latestSynchronization {\n          id\n          jobStatus\n        }\n      }\n    }\n  }\n": types.UserDocument,
    "\n  query OwnerBreadcrumb_owner($login: String!) {\n    owner(login: $login) {\n      id\n      login\n      name\n    }\n  }\n": types.OwnerBreadcrumb_OwnerDocument,
    "\n  query OwnerBreadcrumbMenu_owners {\n    owners {\n      id\n      login\n      name\n    }\n  }\n": types.OwnerBreadcrumbMenu_OwnersDocument,
    "\n  query RepositoryBreadcrumbMenu_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories(enabled: true) {\n        id\n        name\n      }\n    }\n  }\n": types.RepositoryBreadcrumbMenu_OwnerDocument,
    "\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n": types.BuildStatusChip_BuildFragmentDoc,
    "\n  fragment BuildStatusChip_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n": types.BuildStatusChip_RepositoryFragmentDoc,
    "\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total: screenshotCount\n    }\n  }\n": types.BuildStatusDescription_BuildFragmentDoc,
    "\n  fragment BuildStatusDescription_Repository on Repository {\n    referenceBranch\n  }\n": types.BuildStatusDescription_RepositoryFragmentDoc,
    "\n  fragment RepositoryList_repository on Repository {\n    id\n    name\n    enabled\n    owner {\n      id\n      login\n      name\n    }\n    builds(first: 0, after: 0) {\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n": types.RepositoryList_RepositoryFragmentDoc,
    "\n  fragment ReviewButton_Repository on Repository {\n    name\n    permissions\n    private\n    owner {\n      login\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n": types.ReviewButton_RepositoryFragmentDoc,
    "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n": types.SetValidationStatusDocument,
    "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total: screenshotCount\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n": types.BuildDetail_BuildFragmentDoc,
    "\n  query BuildDiffState_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n    $offset: Int!\n    $limit: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(offset: $offset, limit: $limit) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n": types.BuildDiffState_RepositoryDocument,
    "\n  fragment BuildHeader_Build on Build {\n    ...BuildStatusChip_Build\n  }\n": types.BuildHeader_BuildFragmentDoc,
    "\n  fragment BuildHeader_Repository on Repository {\n    ...BuildStatusChip_Repository\n    ...ReviewButton_Repository\n  }\n": types.BuildHeader_RepositoryFragmentDoc,
    "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    stats {\n      total: screenshotCount\n    }\n    baseScreenshotBucket {\n      commit\n    }\n    compareScreenshotBucket {\n      commit\n    }\n  }\n": types.BuildInfos_BuildFragmentDoc,
    "\n  query BuildQuery(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      ...BuildHeader_Repository\n      ...BuildWorkspace_Repository\n      owner {\n        id\n        ...OvercapacityBanner_Owner\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n": types.BuildQueryDocument,
    "\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total: screenshotCount\n    }\n  }\n": types.BuildSidebar_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    stats {\n      total: screenshotCount\n      failure: failedScreenshotCount\n      changed: updatedScreenshotCount\n      added: addedScreenshotCount\n      removed: removedScreenshotCount\n      unchanged: stableScreenshotCount\n    }\n  }\n": types.BuildWorkspace_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Repository on Repository {\n    ...BuildStatusDescription_Repository\n  }\n": types.BuildWorkspace_RepositoryFragmentDoc,
    "\n  fragment OvercapacityBanner_Owner on Owner {\n    plan {\n      name\n    }\n    consumptionRatio\n  }\n": types.OvercapacityBanner_OwnerFragmentDoc,
    "\n  query Home_owners {\n    owners {\n      id\n      repositories {\n        id\n        enabled\n        ...RepositoryList_repository\n      }\n    }\n  }\n": types.Home_OwnersDocument,
    "\n  query OwnerSettings_owner($login: String!) {\n    owner(login: $login) {\n      id\n      name\n      screenshotsLimitPerMonth\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      repositories {\n        id\n        name\n        private\n        currentMonthUsedScreenshots\n      }\n    }\n  }\n": types.OwnerSettings_OwnerDocument,
    "\n  query OwnerRepositories_owner($login: String!) {\n    owner(login: $login) {\n      id\n      repositories {\n        id\n        ...RepositoryList_repository\n      }\n    }\n  }\n": types.OwnerRepositories_OwnerDocument,
    "\n  query Owner_owner($ownerLogin: String!) {\n    owner(login: $ownerLogin) {\n      id\n      permissions\n    }\n  }\n": types.Owner_OwnerDocument,
    "\n  query RepositorySettings_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      token\n      baselineBranch\n      defaultBranch\n    }\n  }\n": types.RepositorySettings_RepositoryDocument,
    "\n  mutation updateReferenceBranch(\n    $repositoryId: String!\n    $baselineBranch: String\n  ) {\n    updateReferenceBranch(\n      repositoryId: $repositoryId\n      baselineBranch: $baselineBranch\n    ) {\n      id\n      baselineBranch\n      defaultBranch\n    }\n  }\n": types.UpdateReferenceBranchDocument,
    "\n  query Repository_repositoryold(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      name\n      token\n      enabled\n      permissions\n      baselineBranch\n      defaultBranch\n      owner {\n        login\n        name\n      }\n      sampleBuildId\n      builds(first: 5, after: 0) {\n        pageInfo {\n          totalCount\n          endCursor\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          status\n          createdAt\n        }\n      }\n    }\n  }\n": types.Repository_RepositoryoldDocument,
    "\n  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n    }\n  }\n": types.Repository_RepositoryDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query User {\n    user {\n      id\n      email\n      name\n      login\n      privateSync\n      latestSynchronization {\n        id\n        jobStatus\n      }\n      installations {\n        id\n        latestSynchronization {\n          id\n          jobStatus\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query User {\n    user {\n      id\n      email\n      name\n      login\n      privateSync\n      latestSynchronization {\n        id\n        jobStatus\n      }\n      installations {\n        id\n        latestSynchronization {\n          id\n          jobStatus\n        }\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total: screenshotCount\n    }\n  }\n"): (typeof documents)["\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total: screenshotCount\n    }\n  }\n"];
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
export function graphql(source: "\n  fragment ReviewButton_Repository on Repository {\n    name\n    permissions\n    private\n    owner {\n      login\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  fragment ReviewButton_Repository on Repository {\n    name\n    permissions\n    private\n    owner {\n      login\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total: screenshotCount\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  fragment BuildDetail_Build on Build {\n    stats {\n      total: screenshotCount\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildDiffState_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n    $offset: Int!\n    $limit: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(offset: $offset, limit: $limit) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildDiffState_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n    $offset: Int!\n    $limit: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(offset: $offset, limit: $limit) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Build on Build {\n    ...BuildStatusChip_Build\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Build on Build {\n    ...BuildStatusChip_Build\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Repository on Repository {\n    ...BuildStatusChip_Repository\n    ...ReviewButton_Repository\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Repository on Repository {\n    ...BuildStatusChip_Repository\n    ...ReviewButton_Repository\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    stats {\n      total: screenshotCount\n    }\n    baseScreenshotBucket {\n      commit\n    }\n    compareScreenshotBucket {\n      commit\n    }\n  }\n"): (typeof documents)["\n  fragment BuildInfos_Build on Build {\n    createdAt\n    stats {\n      total: screenshotCount\n    }\n    baseScreenshotBucket {\n      commit\n    }\n    compareScreenshotBucket {\n      commit\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildQuery(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      ...BuildHeader_Repository\n      ...BuildWorkspace_Repository\n      owner {\n        id\n        ...OvercapacityBanner_Owner\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildQuery(\n    $ownerLogin: String!\n    $repositoryName: String!\n    $buildNumber: Int!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      ...BuildHeader_Repository\n      ...BuildWorkspace_Repository\n      owner {\n        id\n        ...OvercapacityBanner_Owner\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total: screenshotCount\n    }\n  }\n"): (typeof documents)["\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total: screenshotCount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    stats {\n      total: screenshotCount\n      failure: failedScreenshotCount\n      changed: updatedScreenshotCount\n      added: addedScreenshotCount\n      removed: removedScreenshotCount\n      unchanged: stableScreenshotCount\n    }\n  }\n"): (typeof documents)["\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    stats {\n      total: screenshotCount\n      failure: failedScreenshotCount\n      changed: updatedScreenshotCount\n      added: addedScreenshotCount\n      removed: removedScreenshotCount\n      unchanged: stableScreenshotCount\n    }\n  }\n"];
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
export function graphql(source: "\n  query Home_owners {\n    owners {\n      id\n      repositories {\n        id\n        enabled\n        ...RepositoryList_repository\n      }\n    }\n  }\n"): (typeof documents)["\n  query Home_owners {\n    owners {\n      id\n      repositories {\n        id\n        enabled\n        ...RepositoryList_repository\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query OwnerSettings_owner($login: String!) {\n    owner(login: $login) {\n      id\n      name\n      screenshotsLimitPerMonth\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      repositories {\n        id\n        name\n        private\n        currentMonthUsedScreenshots\n      }\n    }\n  }\n"): (typeof documents)["\n  query OwnerSettings_owner($login: String!) {\n    owner(login: $login) {\n      id\n      name\n      screenshotsLimitPerMonth\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      repositories {\n        id\n        name\n        private\n        currentMonthUsedScreenshots\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  query RepositorySettings_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      token\n      baselineBranch\n      defaultBranch\n    }\n  }\n"): (typeof documents)["\n  query RepositorySettings_repository(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      token\n      baselineBranch\n      defaultBranch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateReferenceBranch(\n    $repositoryId: String!\n    $baselineBranch: String\n  ) {\n    updateReferenceBranch(\n      repositoryId: $repositoryId\n      baselineBranch: $baselineBranch\n    ) {\n      id\n      baselineBranch\n      defaultBranch\n    }\n  }\n"): (typeof documents)["\n  mutation updateReferenceBranch(\n    $repositoryId: String!\n    $baselineBranch: String\n  ) {\n    updateReferenceBranch(\n      repositoryId: $repositoryId\n      baselineBranch: $baselineBranch\n    ) {\n      id\n      baselineBranch\n      defaultBranch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Repository_repositoryold(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      name\n      token\n      enabled\n      permissions\n      baselineBranch\n      defaultBranch\n      owner {\n        login\n        name\n      }\n      sampleBuildId\n      builds(first: 5, after: 0) {\n        pageInfo {\n          totalCount\n          endCursor\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          status\n          createdAt\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Repository_repositoryold(\n    $ownerLogin: String!\n    $repositoryName: String!\n  ) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      name\n      token\n      enabled\n      permissions\n      baselineBranch\n      defaultBranch\n      owner {\n        login\n        name\n      }\n      sampleBuildId\n      builds(first: 5, after: 0) {\n        pageInfo {\n          totalCount\n          endCursor\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          status\n          createdAt\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n    }\n  }\n"): (typeof documents)["\n  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {\n    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {\n      id\n      permissions\n    }\n  }\n"];

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
**/
export function graphql(source: string): unknown;

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;