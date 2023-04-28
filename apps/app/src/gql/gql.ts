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
    "\n  fragment AccountAvatarFragment on AccountAvatar {\n    url(size: 64)\n    color\n    initial\n  }\n": types.AccountAvatarFragmentFragmentDoc,
    "\n  query AccountBreadcrumb_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n  }\n": types.AccountBreadcrumb_AccountDocument,
    "\n  fragment AccountBreadcrumbMenu_Account on Account {\n    id\n    slug\n    name\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n": types.AccountBreadcrumbMenu_AccountFragmentDoc,
    "\n  query AccountBreadcrumbMenu_me {\n    me {\n      id\n      ...AccountBreadcrumbMenu_Account\n      teams {\n        id\n        ...AccountBreadcrumbMenu_Account\n      }\n    }\n  }\n": types.AccountBreadcrumbMenu_MeDocument,
    "\n  query ProjectBreadcrumbMenu_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          name\n        }\n      }\n    }\n  }\n": types.ProjectBreadcrumbMenu_AccountDocument,
    "\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n": types.BuildStatusChip_BuildFragmentDoc,
    "\n  fragment BuildStatusChip_Project on Project {\n    ...BuildStatusDescription_Project\n  }\n": types.BuildStatusChip_ProjectFragmentDoc,
    "\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total\n    }\n  }\n": types.BuildStatusDescription_BuildFragmentDoc,
    "\n  fragment BuildStatusDescription_Project on Project {\n    referenceBranch\n  }\n": types.BuildStatusDescription_ProjectFragmentDoc,
    "\n  fragment InstallationsSelect_GhApiInstallation on GhApiInstallation {\n    id\n    account {\n      id\n      login\n      name\n    }\n  }\n": types.InstallationsSelect_GhApiInstallationFragmentDoc,
    "\n  fragment ProjectList_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n    builds(first: 0, after: 0) {\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n": types.ProjectList_ProjectFragmentDoc,
    "\n  query RepositoryList_repository($installationId: ID!, $page: Int!) {\n    ghApiInstallationRepositories(\n      installationId: $installationId\n      page: $page\n    ) {\n      edges {\n        id\n        name\n        updated_at\n        owner_login\n      }\n      pageInfo {\n        hasNextPage\n      }\n    }\n  }\n": types.RepositoryList_RepositoryDocument,
    "\n  fragment ReviewButton_Project on Project {\n    name\n    permissions\n    public\n    account {\n      id\n      slug\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n": types.ReviewButton_ProjectFragmentDoc,
    "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n": types.SetValidationStatusDocument,
    "\n  fragment TeamMembers_Team on Team {\n    id\n    name\n    slug\n    inviteLink\n    users(first: 30, after: 0) {\n      edges {\n        id\n        name\n        slug\n        avatar {\n          ...AccountAvatarFragment\n        }\n      }\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n": types.TeamMembers_TeamFragmentDoc,
    "\n  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {\n    leaveTeam(input: { teamAccountId: $teamAccountId })\n  }\n": types.TeamMembers_LeaveTeamDocument,
    "\n  mutation TeamMembers_removeUserFromTeam(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n  ) {\n    removeUserFromTeam(\n      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }\n    )\n  }\n": types.TeamMembers_RemoveUserFromTeamDocument,
    "\n  mutation NewTeam_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      id\n      slug\n    }\n  }\n": types.NewTeam_CreateTeamDocument,
    "\n  query Vercel_vercelApiTeam($id: ID!, $accessToken: String!) {\n    vercelApiTeam(id: $id, accessToken: $accessToken) {\n      id\n      name\n      slug\n    }\n  }\n": types.Vercel_VercelApiTeamDocument,
    "\n  mutation Vercel_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      id\n      slug\n    }\n  }\n": types.Vercel_CreateTeamDocument,
    "\n  fragment ChooseTeam_Team on Team {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n": types.ChooseTeam_TeamFragmentDoc,
    "\n  query FromTeam_me {\n    me {\n      id\n      teams {\n        id\n        ...ChooseTeam_Team\n      }\n    }\n  }\n": types.FromTeam_MeDocument,
    "\n  query VercelProjectsSummary_me_vercelApiProjects(\n    $teamId: ID\n    $accessToken: String!\n    $accountId: ID!\n  ) {\n    me {\n      ghInstallations {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n    vercelApiProjects(teamId: $teamId, accessToken: $accessToken, limit: 100) {\n      projects {\n        id\n        name\n        status(accountId: $accountId)\n        linkedProject {\n          id\n        }\n        link {\n          __typename\n          type\n          ... on VercelApiProjectLinkGithub {\n            org\n            repo\n            repoId\n          }\n        }\n      }\n    }\n  }\n": types.VercelProjectsSummary_Me_VercelApiProjectsDocument,
    "\n  mutation VercelProjectsSummary_createProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    createProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n": types.VercelProjectsSummary_CreateProjectDocument,
    "\n  mutation VercelProjectsSummary_setupVercelIntegration(\n    $input: SetupVercelIntegrationInput!\n  ) {\n    setupVercelIntegration(input: $input)\n  }\n": types.VercelProjectsSummary_SetupVercelIntegrationDocument,
    "\n  mutation Vercel_retrieveVercelToken($code: String!) {\n    retrieveVercelToken(code: $code) {\n      access_token\n      installation_id\n      user_id\n      team_id\n    }\n  }\n": types.Vercel_RetrieveVercelTokenDocument,
    "\n  query AccountCheckout_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      stripeClientReferenceId\n      purchase {\n        id\n        source\n      }\n    }\n  }\n": types.AccountCheckout_AccountDocument,
    "\n  query AccountNewProject_me {\n    me {\n      ghInstallations {\n        edges {\n          id\n          ...InstallationsSelect_GhApiInstallation\n        }\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n": types.AccountNewProject_MeDocument,
    "\n  mutation NewProject_createProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    createProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n": types.NewProject_CreateProjectDocument,
    "\n  query AccountProjects_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          ...ProjectList_Project\n        }\n      }\n    }\n  }\n": types.AccountProjects_AccountDocument,
    "\n  query AccountSettings_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      name\n      screenshotsLimitPerMonth\n      stripeCustomerId\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      purchase {\n        id\n        source\n      }\n\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          name\n          public\n          currentMonthUsedScreenshots\n        }\n      }\n      ...TeamMembers_Team\n    }\n  }\n": types.AccountSettings_AccountDocument,
    "\n  query Account_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n    }\n  }\n": types.Account_AccountDocument,
    "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n": types.BuildDetail_BuildFragmentDoc,
    "\n  query BuildDiffState_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            flakyDetected\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n            test {\n              id\n              status\n              unstable\n              resolvedDate\n              mute\n              muteUntil\n            }\n          }\n        }\n      }\n    }\n  }\n": types.BuildDiffState_ProjectDocument,
    "\n  fragment BuildHeader_Build on Build {\n    name\n    ...BuildStatusChip_Build\n  }\n": types.BuildHeader_BuildFragmentDoc,
    "\n  fragment BuildHeader_Project on Project {\n    ...BuildStatusChip_Project\n    ...ReviewButton_Project\n  }\n": types.BuildHeader_ProjectFragmentDoc,
    "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    prNumber\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    compareScreenshotBucket {\n      commit\n      branch\n    }\n  }\n": types.BuildInfos_BuildFragmentDoc,
    "\n  query BuildPage_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...BuildHeader_Project\n      ...BuildWorkspace_Project\n      account {\n        id\n        ...OvercapacityBanner_Account\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n": types.BuildPage_ProjectDocument,
    "\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total\n    }\n  }\n": types.BuildSidebar_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    stats {\n      total\n      failure\n      changed\n      added\n      removed\n      unchanged\n    }\n  }\n": types.BuildWorkspace_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Project on Project {\n    ...BuildStatusDescription_Project\n  }\n": types.BuildWorkspace_ProjectFragmentDoc,
    "\n  fragment OvercapacityBanner_Account on Account {\n    plan {\n      id\n      name\n    }\n    consumptionRatio\n  }\n": types.OvercapacityBanner_AccountFragmentDoc,
    "\n  query Checkout_success {\n    me {\n      id\n      lastPurchase {\n        id\n        account {\n          id\n          slug\n        }\n      }\n    }\n  }\n": types.Checkout_SuccessDocument,
    "\n  query Invite_invitation($token: String!) {\n    invitation(token: $token) {\n      id\n      name\n      slug\n    }\n  }\n": types.Invite_InvitationDocument,
    "\n  mutation Invite_acceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n      slug\n    }\n  }\n": types.Invite_AcceptInvitationDocument,
    "\n  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      ...GettingStarted_Project\n      ...BuildStatusChip_Project\n    }\n  }\n": types.ProjectBuilds_ProjectDocument,
    "\n  query ProjectBuilds_project_Builds(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      builds(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          compareScreenshotBucket {\n            id\n            branch\n            commit\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n": types.ProjectBuilds_Project_BuildsDocument,
    "\n  fragment GettingStarted_Project on Project {\n    token\n  }\n": types.GettingStarted_ProjectFragmentDoc,
    "\n  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      token\n      baselineBranch\n      ghRepository {\n        id\n        defaultBranch\n        private\n      }\n      private\n    }\n  }\n": types.ProjectSettings_ProjectDocument,
    "\n  mutation ProjectSettings_updateBaselineBranch(\n    $projectId: ID!\n    $baselineBranch: String\n  ) {\n    updateProject(input: { id: $projectId, baselineBranch: $baselineBranch }) {\n      id\n      baselineBranch\n    }\n  }\n": types.ProjectSettings_UpdateBaselineBranchDocument,
    "\n  mutation ProjectSettings_UpdatePrivate($projectId: ID!, $private: Boolean) {\n    updateProject(input: { id: $projectId, private: $private }) {\n      id\n      private\n    }\n  }\n": types.ProjectSettings_UpdatePrivateDocument,
    "\n  query FlakyTests_project_tests(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      tests(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          name\n          buildName\n          status\n          resolvedDate\n          mute\n          muteUntil\n          stabilityScore\n          lastSeen\n          unstable\n          dailyChanges {\n            date\n            count\n          }\n          totalBuilds\n          screenshot {\n            id\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n": types.FlakyTests_Project_TestsDocument,
    "\n  mutation muteTests($ids: [String!]!, $muted: Boolean!, $muteUntil: String) {\n    muteTests(ids: $ids, muted: $muted, muteUntil: $muteUntil) {\n      ids\n      mute\n      muteUntil\n    }\n  }\n": types.MuteTestsDocument,
    "\n  mutation updateStatusesMutation($ids: [String!]!, $status: TestStatus!) {\n    updateTestStatuses(ids: $ids, status: $status) {\n      ids\n      status\n    }\n  }\n": types.UpdateStatusesMutationDocument,
    "\n  query Project_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      tests(first: 0, after: 0) {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n": types.Project_ProjectDocument,
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
export function graphql(source: "\n  fragment AccountAvatarFragment on AccountAvatar {\n    url(size: 64)\n    color\n    initial\n  }\n"): (typeof documents)["\n  fragment AccountAvatarFragment on AccountAvatar {\n    url(size: 64)\n    color\n    initial\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountBreadcrumb_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n  }\n"): (typeof documents)["\n  query AccountBreadcrumb_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AccountBreadcrumbMenu_Account on Account {\n    id\n    slug\n    name\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"): (typeof documents)["\n  fragment AccountBreadcrumbMenu_Account on Account {\n    id\n    slug\n    name\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountBreadcrumbMenu_me {\n    me {\n      id\n      ...AccountBreadcrumbMenu_Account\n      teams {\n        id\n        ...AccountBreadcrumbMenu_Account\n      }\n    }\n  }\n"): (typeof documents)["\n  query AccountBreadcrumbMenu_me {\n    me {\n      id\n      ...AccountBreadcrumbMenu_Account\n      teams {\n        id\n        ...AccountBreadcrumbMenu_Account\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectBreadcrumbMenu_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProjectBreadcrumbMenu_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n"): (typeof documents)["\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusChip_Project on Project {\n    ...BuildStatusDescription_Project\n  }\n"): (typeof documents)["\n  fragment BuildStatusChip_Project on Project {\n    ...BuildStatusDescription_Project\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total\n    }\n  }\n"): (typeof documents)["\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildStatusDescription_Project on Project {\n    referenceBranch\n  }\n"): (typeof documents)["\n  fragment BuildStatusDescription_Project on Project {\n    referenceBranch\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment InstallationsSelect_GhApiInstallation on GhApiInstallation {\n    id\n    account {\n      id\n      login\n      name\n    }\n  }\n"): (typeof documents)["\n  fragment InstallationsSelect_GhApiInstallation on GhApiInstallation {\n    id\n    account {\n      id\n      login\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectList_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n    builds(first: 0, after: 0) {\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectList_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n    builds(first: 0, after: 0) {\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RepositoryList_repository($installationId: ID!, $page: Int!) {\n    ghApiInstallationRepositories(\n      installationId: $installationId\n      page: $page\n    ) {\n      edges {\n        id\n        name\n        updated_at\n        owner_login\n      }\n      pageInfo {\n        hasNextPage\n      }\n    }\n  }\n"): (typeof documents)["\n  query RepositoryList_repository($installationId: ID!, $page: Int!) {\n    ghApiInstallationRepositories(\n      installationId: $installationId\n      page: $page\n    ) {\n      edges {\n        id\n        name\n        updated_at\n        owner_login\n      }\n      pageInfo {\n        hasNextPage\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ReviewButton_Project on Project {\n    name\n    permissions\n    public\n    account {\n      id\n      slug\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  fragment ReviewButton_Project on Project {\n    name\n    permissions\n    public\n    account {\n      id\n      slug\n      consumptionRatio\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment TeamMembers_Team on Team {\n    id\n    name\n    slug\n    inviteLink\n    users(first: 30, after: 0) {\n      edges {\n        id\n        name\n        slug\n        avatar {\n          ...AccountAvatarFragment\n        }\n      }\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment TeamMembers_Team on Team {\n    id\n    name\n    slug\n    inviteLink\n    users(first: 30, after: 0) {\n      edges {\n        id\n        name\n        slug\n        avatar {\n          ...AccountAvatarFragment\n        }\n      }\n      pageInfo {\n        totalCount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {\n    leaveTeam(input: { teamAccountId: $teamAccountId })\n  }\n"): (typeof documents)["\n  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {\n    leaveTeam(input: { teamAccountId: $teamAccountId })\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation TeamMembers_removeUserFromTeam(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n  ) {\n    removeUserFromTeam(\n      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }\n    )\n  }\n"): (typeof documents)["\n  mutation TeamMembers_removeUserFromTeam(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n  ) {\n    removeUserFromTeam(\n      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }\n    )\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation NewTeam_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation NewTeam_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Vercel_vercelApiTeam($id: ID!, $accessToken: String!) {\n    vercelApiTeam(id: $id, accessToken: $accessToken) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  query Vercel_vercelApiTeam($id: ID!, $accessToken: String!) {\n    vercelApiTeam(id: $id, accessToken: $accessToken) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Vercel_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation Vercel_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ChooseTeam_Team on Team {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"): (typeof documents)["\n  fragment ChooseTeam_Team on Team {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FromTeam_me {\n    me {\n      id\n      teams {\n        id\n        ...ChooseTeam_Team\n      }\n    }\n  }\n"): (typeof documents)["\n  query FromTeam_me {\n    me {\n      id\n      teams {\n        id\n        ...ChooseTeam_Team\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query VercelProjectsSummary_me_vercelApiProjects(\n    $teamId: ID\n    $accessToken: String!\n    $accountId: ID!\n  ) {\n    me {\n      ghInstallations {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n    vercelApiProjects(teamId: $teamId, accessToken: $accessToken, limit: 100) {\n      projects {\n        id\n        name\n        status(accountId: $accountId)\n        linkedProject {\n          id\n        }\n        link {\n          __typename\n          type\n          ... on VercelApiProjectLinkGithub {\n            org\n            repo\n            repoId\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query VercelProjectsSummary_me_vercelApiProjects(\n    $teamId: ID\n    $accessToken: String!\n    $accountId: ID!\n  ) {\n    me {\n      ghInstallations {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n    vercelApiProjects(teamId: $teamId, accessToken: $accessToken, limit: 100) {\n      projects {\n        id\n        name\n        status(accountId: $accountId)\n        linkedProject {\n          id\n        }\n        link {\n          __typename\n          type\n          ... on VercelApiProjectLinkGithub {\n            org\n            repo\n            repoId\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation VercelProjectsSummary_createProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    createProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation VercelProjectsSummary_createProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    createProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation VercelProjectsSummary_setupVercelIntegration(\n    $input: SetupVercelIntegrationInput!\n  ) {\n    setupVercelIntegration(input: $input)\n  }\n"): (typeof documents)["\n  mutation VercelProjectsSummary_setupVercelIntegration(\n    $input: SetupVercelIntegrationInput!\n  ) {\n    setupVercelIntegration(input: $input)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Vercel_retrieveVercelToken($code: String!) {\n    retrieveVercelToken(code: $code) {\n      access_token\n      installation_id\n      user_id\n      team_id\n    }\n  }\n"): (typeof documents)["\n  mutation Vercel_retrieveVercelToken($code: String!) {\n    retrieveVercelToken(code: $code) {\n      access_token\n      installation_id\n      user_id\n      team_id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountCheckout_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      stripeClientReferenceId\n      purchase {\n        id\n        source\n      }\n    }\n  }\n"): (typeof documents)["\n  query AccountCheckout_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      stripeClientReferenceId\n      purchase {\n        id\n        source\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountNewProject_me {\n    me {\n      ghInstallations {\n        edges {\n          id\n          ...InstallationsSelect_GhApiInstallation\n        }\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query AccountNewProject_me {\n    me {\n      ghInstallations {\n        edges {\n          id\n          ...InstallationsSelect_GhApiInstallation\n        }\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation NewProject_createProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    createProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation NewProject_createProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    createProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountProjects_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          ...ProjectList_Project\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query AccountProjects_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          ...ProjectList_Project\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountSettings_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      name\n      screenshotsLimitPerMonth\n      stripeCustomerId\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      purchase {\n        id\n        source\n      }\n\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          name\n          public\n          currentMonthUsedScreenshots\n        }\n      }\n      ...TeamMembers_Team\n    }\n  }\n"): (typeof documents)["\n  query AccountSettings_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      name\n      screenshotsLimitPerMonth\n      stripeCustomerId\n\n      plan {\n        id\n        name\n        screenshotsLimitPerMonth\n      }\n\n      purchase {\n        id\n        source\n      }\n\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          name\n          public\n          currentMonthUsedScreenshots\n        }\n      }\n      ...TeamMembers_Team\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Account_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n    }\n  }\n"): (typeof documents)["\n  query Account_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    compareScreenshotBucket {\n      branch\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildDiffState_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            flakyDetected\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n            test {\n              id\n              status\n              unstable\n              resolvedDate\n              mute\n              muteUntil\n            }\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildDiffState_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            id\n            status\n            url\n            name\n            width\n            height\n            flakyDetected\n            baseScreenshot {\n              id\n              url\n              width\n              height\n            }\n            compareScreenshot {\n              id\n              url\n              width\n              height\n            }\n            test {\n              id\n              status\n              unstable\n              resolvedDate\n              mute\n              muteUntil\n            }\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Build on Build {\n    name\n    ...BuildStatusChip_Build\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Build on Build {\n    name\n    ...BuildStatusChip_Build\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Project on Project {\n    ...BuildStatusChip_Project\n    ...ReviewButton_Project\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Project on Project {\n    ...BuildStatusChip_Project\n    ...ReviewButton_Project\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    prNumber\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    compareScreenshotBucket {\n      commit\n      branch\n    }\n  }\n"): (typeof documents)["\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    prNumber\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    compareScreenshotBucket {\n      commit\n      branch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildPage_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...BuildHeader_Project\n      ...BuildWorkspace_Project\n      account {\n        id\n        ...OvercapacityBanner_Account\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildPage_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...BuildHeader_Project\n      ...BuildWorkspace_Project\n      account {\n        id\n        ...OvercapacityBanner_Account\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  fragment BuildWorkspace_Project on Project {\n    ...BuildStatusDescription_Project\n  }\n"): (typeof documents)["\n  fragment BuildWorkspace_Project on Project {\n    ...BuildStatusDescription_Project\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment OvercapacityBanner_Account on Account {\n    plan {\n      id\n      name\n    }\n    consumptionRatio\n  }\n"): (typeof documents)["\n  fragment OvercapacityBanner_Account on Account {\n    plan {\n      id\n      name\n    }\n    consumptionRatio\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Checkout_success {\n    me {\n      id\n      lastPurchase {\n        id\n        account {\n          id\n          slug\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Checkout_success {\n    me {\n      id\n      lastPurchase {\n        id\n        account {\n          id\n          slug\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Invite_invitation($token: String!) {\n    invitation(token: $token) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  query Invite_invitation($token: String!) {\n    invitation(token: $token) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Invite_acceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation Invite_acceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      ...GettingStarted_Project\n      ...BuildStatusChip_Project\n    }\n  }\n"): (typeof documents)["\n  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      ...GettingStarted_Project\n      ...BuildStatusChip_Project\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectBuilds_project_Builds(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      builds(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          compareScreenshotBucket {\n            id\n            branch\n            commit\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProjectBuilds_project_Builds(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      builds(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          compareScreenshotBucket {\n            id\n            branch\n            commit\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment GettingStarted_Project on Project {\n    token\n  }\n"): (typeof documents)["\n  fragment GettingStarted_Project on Project {\n    token\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      token\n      baselineBranch\n      ghRepository {\n        id\n        defaultBranch\n        private\n      }\n      private\n    }\n  }\n"): (typeof documents)["\n  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      token\n      baselineBranch\n      ghRepository {\n        id\n        defaultBranch\n        private\n      }\n      private\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectSettings_updateBaselineBranch(\n    $projectId: ID!\n    $baselineBranch: String\n  ) {\n    updateProject(input: { id: $projectId, baselineBranch: $baselineBranch }) {\n      id\n      baselineBranch\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectSettings_updateBaselineBranch(\n    $projectId: ID!\n    $baselineBranch: String\n  ) {\n    updateProject(input: { id: $projectId, baselineBranch: $baselineBranch }) {\n      id\n      baselineBranch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectSettings_UpdatePrivate($projectId: ID!, $private: Boolean) {\n    updateProject(input: { id: $projectId, private: $private }) {\n      id\n      private\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectSettings_UpdatePrivate($projectId: ID!, $private: Boolean) {\n    updateProject(input: { id: $projectId, private: $private }) {\n      id\n      private\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query FlakyTests_project_tests(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      tests(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          name\n          buildName\n          status\n          resolvedDate\n          mute\n          muteUntil\n          stabilityScore\n          lastSeen\n          unstable\n          dailyChanges {\n            date\n            count\n          }\n          totalBuilds\n          screenshot {\n            id\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query FlakyTests_project_tests(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      tests(first: $first, after: $after) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          name\n          buildName\n          status\n          resolvedDate\n          mute\n          muteUntil\n          stabilityScore\n          lastSeen\n          unstable\n          dailyChanges {\n            date\n            count\n          }\n          totalBuilds\n          screenshot {\n            id\n            url\n            width\n            height\n          }\n        }\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  query Project_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      tests(first: 0, after: 0) {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query Project_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      tests(first: 0, after: 0) {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;