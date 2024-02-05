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
    "\n  fragment AccountChangeName_Account on Account {\n    id\n    name\n    slug\n  }\n": types.AccountChangeName_AccountFragmentDoc,
    "\n  mutation AccountChangeName_updateAccount($id: ID!, $name: String!) {\n    updateAccount(input: { id: $id, name: $name }) {\n      id\n      name\n    }\n  }\n": types.AccountChangeName_UpdateAccountDocument,
    "\n  fragment AccountChangeSlug_Account on Account {\n    id\n    slug\n  }\n": types.AccountChangeSlug_AccountFragmentDoc,
    "\n  mutation AccountChangeSlug_updateAccount($id: ID!, $slug: String!) {\n    updateAccount(input: { id: $id, slug: $slug }) {\n      id\n      slug\n    }\n  }\n": types.AccountChangeSlug_UpdateAccountDocument,
    "\n  fragment AccountGitLab_Account on Account {\n    id\n    permissions\n    gitlabAccessToken\n  }\n": types.AccountGitLab_AccountFragmentDoc,
    "\n  mutation AccountGitLab_updateAccount($id: ID!, $gitlabAccessToken: String) {\n    updateAccount(input: { id: $id, gitlabAccessToken: $gitlabAccessToken }) {\n      id\n      gitlabAccessToken\n    }\n  }\n": types.AccountGitLab_UpdateAccountDocument,
    "\n  fragment AccountAvatarFragment on AccountAvatar {\n    url(size: 64)\n    color\n    initial\n  }\n": types.AccountAvatarFragmentFragmentDoc,
    "\n  fragment AccountItem_Account on Account {\n    id\n    slug\n    name\n    avatar {\n      ...AccountAvatarFragment\n    }\n    ...AccountPlanChip_Account\n  }\n": types.AccountItem_AccountFragmentDoc,
    "\n  fragment AccountPlanChip_Account on Account {\n    subscriptionStatus\n    plan {\n      id\n      displayName\n    }\n  }\n": types.AccountPlanChip_AccountFragmentDoc,
    "\n  query AccountBreadcrumb_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n      ...AccountPlanChip_Account\n    }\n  }\n": types.AccountBreadcrumb_AccountDocument,
    "\n  fragment AccountBreadcrumbMenu_Account on Account {\n    id\n    slug\n    ...AccountItem_Account\n  }\n": types.AccountBreadcrumbMenu_AccountFragmentDoc,
    "\n  query AccountBreadcrumbMenu_me {\n    me {\n      id\n      ...AccountBreadcrumbMenu_Account\n      teams {\n        id\n        ...AccountBreadcrumbMenu_Account\n      }\n    }\n  }\n": types.AccountBreadcrumbMenu_MeDocument,
    "\n  query ProjectBreadcrumbMenu_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          name\n        }\n      }\n    }\n  }\n": types.ProjectBreadcrumbMenu_AccountDocument,
    "\n  fragment BuildStatusChip_Build on Build {\n    ...BuildStatusDescription_Build\n    type\n    status\n  }\n": types.BuildStatusChip_BuildFragmentDoc,
    "\n  fragment BuildStatusChip_Project on Project {\n    ...BuildStatusDescription_Project\n  }\n": types.BuildStatusChip_ProjectFragmentDoc,
    "\n  fragment BuildStatusDescription_Build on Build {\n    type\n    status\n    batchCount\n    totalBatch\n    stats {\n      total\n    }\n  }\n": types.BuildStatusDescription_BuildFragmentDoc,
    "\n  fragment BuildStatusDescription_Project on Project {\n    referenceBranch\n  }\n": types.BuildStatusDescription_ProjectFragmentDoc,
    "\n  fragment GithubInstallationsSelect_GhApiInstallation on GhApiInstallation {\n    id\n    account {\n      id\n      login\n      name\n    }\n  }\n": types.GithubInstallationsSelect_GhApiInstallationFragmentDoc,
    "\n  query GithubRepositoryList_ghApiInstallationRepositories(\n    $installationId: ID!\n    $page: Int!\n    $reposPerPage: Int\n  ) {\n    ghApiInstallationRepositories(\n      installationId: $installationId\n      page: $page\n      reposPerPage: $reposPerPage\n    ) {\n      edges {\n        id\n        name\n        updated_at\n        owner_login\n      }\n      pageInfo {\n        hasNextPage\n        totalCount\n      }\n    }\n  }\n": types.GithubRepositoryList_GhApiInstallationRepositoriesDocument,
    "\n  fragment GitlabNamespacesSelect_GlApiNamespace on GlApiNamespace {\n    id\n    name\n    path\n  }\n": types.GitlabNamespacesSelect_GlApiNamespaceFragmentDoc,
    "\n  query GitlabProjectList_glApiProjects(\n    $userId: ID\n    $groupId: ID\n    $allProjects: Boolean!\n    $accessToken: String!\n    $page: Int!\n    $search: String\n  ) {\n    glApiProjects(\n      userId: $userId\n      groupId: $groupId\n      allProjects: $allProjects\n      accessToken: $accessToken\n      page: $page\n      search: $search\n    ) {\n      edges {\n        id\n        name\n        last_activity_at\n      }\n      pageInfo {\n        hasNextPage\n      }\n    }\n  }\n": types.GitlabProjectList_GlApiProjectsDocument,
    "\n  query NavUserControl_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n  }\n": types.NavUserControl_AccountDocument,
    "\n  fragment PaymentBanner_Account on Account {\n    id\n    subscriptionStatus\n    permissions\n    stripeCustomerId\n    pendingCancelAt\n\n    subscription {\n      id\n      trialDaysRemaining\n      provider\n      paymentMethodFilled\n    }\n  }\n": types.PaymentBanner_AccountFragmentDoc,
    "\n  query PaymentBanner_me {\n    me {\n      id\n      hasSubscribedToTrial\n    }\n  }\n": types.PaymentBanner_MeDocument,
    "\n  mutation terminateTrial($accountId: ID!) {\n    terminateTrial(accountId: $accountId) {\n      id\n      subscriptionStatus\n      __typename\n    }\n  }\n": types.TerminateTrialDocument,
    "\n  fragment PlanCard_Account on Account {\n    __typename\n    id\n    stripeCustomerId\n    periodStartDate\n    periodEndDate\n    subscriptionStatus\n    trialStatus\n    hasForcedPlan\n    pendingCancelAt\n    paymentProvider\n    includedScreenshots\n\n    plan {\n      id\n      displayName\n    }\n\n    subscription {\n      id\n      paymentMethodFilled\n    }\n\n    projects(first: 100, after: 0) {\n      edges {\n        id\n        name\n        public\n        currentPeriodScreenshots\n      }\n    }\n  }\n": types.PlanCard_AccountFragmentDoc,
    "\n  fragment ProjectBadge_Project on Project {\n    id\n    slug\n  }\n": types.ProjectBadge_ProjectFragmentDoc,
    "\n  fragment ProjectChangeName_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n    }\n  }\n": types.ProjectChangeName_ProjectFragmentDoc,
    "\n  mutation ProjectChangeName_updateProject($id: ID!, $name: String!) {\n    updateProject(input: { id: $id, name: $name }) {\n      id\n      name\n    }\n  }\n": types.ProjectChangeName_UpdateProjectDocument,
    "\n  query ConnectRepository($accountSlug: String!) {\n    account(slug: $accountSlug) {\n      id\n      gitlabAccessToken\n      glNamespaces {\n        edges {\n          id\n          kind\n          ...GitlabNamespacesSelect_GlApiNamespace\n        }\n      }\n      permissions\n    }\n    me {\n      id\n      ghInstallations {\n        edges {\n          id\n          ...GithubInstallationsSelect_GhApiInstallation\n        }\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n": types.ConnectRepositoryDocument,
    "\n  mutation DeleteProjectMutation($projectId: ID!) {\n    deleteProject(id: $projectId)\n  }\n": types.DeleteProjectMutationDocument,
    "\n  fragment ProjectDelete_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n    }\n  }\n": types.ProjectDelete_ProjectFragmentDoc,
    "\n  fragment ProjectGitRepository_Project on Project {\n    id\n    account {\n      id\n      slug\n    }\n    repository {\n      __typename\n      id\n      fullName\n      url\n    }\n    prCommentEnabled\n  }\n": types.ProjectGitRepository_ProjectFragmentDoc,
    "\n  mutation ProjectGitRepository_linkGithubRepository(\n    $projectId: ID!\n    $repo: String!\n    $owner: String!\n  ) {\n    linkGithubRepository(\n      input: { projectId: $projectId, repo: $repo, owner: $owner }\n    ) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n": types.ProjectGitRepository_LinkGithubRepositoryDocument,
    "\n  mutation ProjectGitRepository_unlinkGithubRepository($projectId: ID!) {\n    unlinkGithubRepository(input: { projectId: $projectId }) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n": types.ProjectGitRepository_UnlinkGithubRepositoryDocument,
    "\n  mutation ProjectGitRepository_linkGitlabProject(\n    $projectId: ID!\n    $gitlabProjectId: ID!\n  ) {\n    linkGitlabProject(\n      input: { projectId: $projectId, gitlabProjectId: $gitlabProjectId }\n    ) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n": types.ProjectGitRepository_LinkGitlabProjectDocument,
    "\n  mutation ProjectGitRepository_unlinkGitlabProject($projectId: ID!) {\n    unlinkGitlabProject(input: { projectId: $projectId }) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n": types.ProjectGitRepository_UnlinkGitlabProjectDocument,
    "\n  mutation ProjectGitRepository_updateEnablePrComment(\n    $id: ID!\n    $enable: Boolean!\n  ) {\n    updateProjectPrComment(input: { id: $id, enable: $enable }) {\n      id\n      prCommentEnabled\n    }\n  }\n": types.ProjectGitRepository_UpdateEnablePrCommentDocument,
    "\n  mutation ProjectReferenceBranch_updateProject(\n    $id: ID!\n    $baselineBranch: String\n  ) {\n    updateProject(input: { id: $id, baselineBranch: $baselineBranch }) {\n      id\n      baselineBranch\n    }\n  }\n": types.ProjectReferenceBranch_UpdateProjectDocument,
    "\n  fragment ProjectReferenceBranch_Project on Project {\n    id\n    baselineBranch\n    repository {\n      __typename\n      id\n      defaultBranch\n    }\n  }\n": types.ProjectReferenceBranch_ProjectFragmentDoc,
    "\n  mutation ProjectStatusChecks_updateProject(\n    $id: ID!\n    $summaryCheck: SummaryCheck\n  ) {\n    updateProject(input: { id: $id, summaryCheck: $summaryCheck }) {\n      id\n      summaryCheck\n    }\n  }\n": types.ProjectStatusChecks_UpdateProjectDocument,
    "\n  fragment ProjectStatusChecks_Project on Project {\n    id\n    summaryCheck\n  }\n": types.ProjectStatusChecks_ProjectFragmentDoc,
    "\n  fragment ProjectToken_Project on Project {\n    token\n  }\n": types.ProjectToken_ProjectFragmentDoc,
    "\n  query TransferProject_me {\n    me {\n      id\n      ...AccountItem_Account\n      teams {\n        id\n        ...AccountItem_Account\n      }\n    }\n  }\n": types.TransferProject_MeDocument,
    "\n  fragment ProjectTransfer_Account on Account {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n": types.ProjectTransfer_AccountFragmentDoc,
    "\n  query ProjectTransfer_Review(\n    $projectId: ID!\n    $actualAccountId: ID!\n    $targetAccountId: ID!\n  ) {\n    projectById(id: $projectId) {\n      id\n      builds {\n        pageInfo {\n          totalCount\n        }\n      }\n      totalScreenshots\n    }\n\n    actualAccount: accountById(id: $actualAccountId) {\n      id\n      ...ProjectTransfer_Account\n      plan {\n        id\n        displayName\n      }\n    }\n\n    targetAccount: accountById(id: $targetAccountId) {\n      id\n      ...ProjectTransfer_Account\n      plan {\n        id\n        displayName\n      }\n    }\n  }\n": types.ProjectTransfer_ReviewDocument,
    "\n  mutation ProjectTransfer_TransferProject(\n    $projectId: ID!\n    $targetAccountId: ID!\n    $name: String!\n  ) {\n    transferProject(\n      input: { id: $projectId, targetAccountId: $targetAccountId, name: $name }\n    ) {\n      id\n      name\n      account {\n        id\n        name\n        slug\n      }\n    }\n  }\n": types.ProjectTransfer_TransferProjectDocument,
    "\n  fragment ProjectTransfer_Project on Project {\n    id\n    name\n    slug\n    account {\n      id\n      name\n      slug\n    }\n  }\n": types.ProjectTransfer_ProjectFragmentDoc,
    "\n  mutation ProjectVisibility_updateProject($id: ID!, $private: Boolean) {\n    updateProject(input: { id: $id, private: $private }) {\n      id\n      private\n    }\n  }\n": types.ProjectVisibility_UpdateProjectDocument,
    "\n  fragment ProjectVisibility_Project on Project {\n    id\n    private\n    repository {\n      __typename\n      id\n      private\n    }\n  }\n": types.ProjectVisibility_ProjectFragmentDoc,
    "\n  fragment ProjectList_Project on Project {\n    id\n    name\n    slug\n    account {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n    repository {\n      __typename\n      id\n      fullName\n    }\n    latestBuild {\n      id\n      createdAt\n    }\n  }\n": types.ProjectList_ProjectFragmentDoc,
    "\n  fragment PullRequestStatusIcon_PullRequest on PullRequest {\n    draft\n    merged\n    state\n  }\n": types.PullRequestStatusIcon_PullRequestFragmentDoc,
    "\n  fragment PullRequestInfo_PullRequest on PullRequest {\n    title\n    draft\n    merged\n    mergedAt\n    closedAt\n    state\n    number\n    date\n    url\n    ...PullRequestStatusIcon_PullRequest\n    ... on GithubPullRequest {\n      creator {\n        id\n        login\n        name\n      }\n    }\n  }\n": types.PullRequestInfo_PullRequestFragmentDoc,
    "\n  fragment PullRequestButton_PullRequest on PullRequest {\n    title\n    number\n    url\n    ...PullRequestStatusIcon_PullRequest\n    ...PullRequestInfo_PullRequest\n  }\n": types.PullRequestButton_PullRequestFragmentDoc,
    "\n  fragment ReviewButton_Project on Project {\n    name\n    permissions\n    public\n    account {\n      id\n      slug\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n": types.ReviewButton_ProjectFragmentDoc,
    "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n": types.SetValidationStatusDocument,
    "\n  fragment TeamDelete_Team on Team {\n    id\n    slug\n    subscriptionStatus\n    pendingCancelAt\n  }\n": types.TeamDelete_TeamFragmentDoc,
    "\n  mutation DeleteTeamMutation($teamAccountId: ID!) {\n    deleteTeam(input: { accountId: $teamAccountId })\n  }\n": types.DeleteTeamMutationDocument,
    "\n  query TeamMembers_teamMembers($id: ID!, $first: Int!, $after: Int!) {\n    team: teamById(id: $id) {\n      id\n      members(first: $first, after: $after) {\n        edges {\n          id\n          level\n          user {\n            id\n            name\n            slug\n            avatar {\n              ...AccountAvatarFragment\n            }\n            ...RemoveFromTeamDialog_User\n          }\n          ...LevelSelect_TeamMember\n        }\n        pageInfo {\n          hasNextPage\n          totalCount\n        }\n      }\n    }\n  }\n": types.TeamMembers_TeamMembersDocument,
    "\n  fragment TeamMembers_Team on Team {\n    id\n    name\n    slug\n    inviteLink\n    me {\n      id\n      level\n      user {\n        id\n        name\n        slug\n        avatar {\n          ...AccountAvatarFragment\n        }\n        ...RemoveFromTeamDialog_User\n      }\n      ...LevelSelect_TeamMember\n    }\n  }\n": types.TeamMembers_TeamFragmentDoc,
    "\n  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {\n    leaveTeam(input: { teamAccountId: $teamAccountId })\n  }\n": types.TeamMembers_LeaveTeamDocument,
    "\n  mutation TeamMembers_removeUserFromTeam(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n  ) {\n    removeUserFromTeam(\n      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }\n    ) {\n      teamMemberId\n    }\n  }\n": types.TeamMembers_RemoveUserFromTeamDocument,
    "\n  fragment RemoveFromTeamDialog_User on User {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n": types.RemoveFromTeamDialog_UserFragmentDoc,
    "\n  mutation SetTeamMemberLevelMutation(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n    $level: TeamUserLevel!\n  ) {\n    setTeamMemberLevel(\n      input: {\n        teamAccountId: $teamAccountId\n        userAccountId: $userAccountId\n        level: $level\n      }\n    ) {\n      id\n      level\n    }\n  }\n": types.SetTeamMemberLevelMutationDocument,
    "\n  fragment LevelSelect_TeamMember on TeamMember {\n    id\n    level\n    user {\n      id\n    }\n  }\n": types.LevelSelect_TeamMemberFragmentDoc,
    "\n  mutation NewTeam_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      redirectUrl\n    }\n  }\n": types.NewTeam_CreateTeamDocument,
    "\n  query TeamNewForm_me {\n    me {\n      id\n      stripeCustomerId\n      hasSubscribedToTrial\n    }\n  }\n": types.TeamNewForm_MeDocument,
    "\n  query UpgradeDialog_me {\n    me {\n      id\n      slug\n      hasSubscribedToTrial\n      ...AccountItem_Account\n      teams {\n        id\n        slug\n        hasPaidPlan\n        ...AccountItem_Account\n      }\n    }\n  }\n": types.UpgradeDialog_MeDocument,
    "\n  query Vercel_vercelApiTeam($id: ID!, $accessToken: String!) {\n    vercelApiTeam(id: $id, accessToken: $accessToken) {\n      id\n      name\n      slug\n    }\n  }\n": types.Vercel_VercelApiTeamDocument,
    "\n  mutation Vercel_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      team {\n        id\n        slug\n      }\n    }\n  }\n": types.Vercel_CreateTeamDocument,
    "\n  fragment ChooseTeam_Team on Team {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n": types.ChooseTeam_TeamFragmentDoc,
    "\n  query FromTeam_me {\n    me {\n      id\n      teams {\n        id\n        ...ChooseTeam_Team\n      }\n    }\n  }\n": types.FromTeam_MeDocument,
    "\n  query VercelProjectsSummary_me_vercelApiProjects(\n    $teamId: ID\n    $accessToken: String!\n    $accountId: ID!\n  ) {\n    me {\n      id\n      ghInstallations {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n    vercelApiProjects(teamId: $teamId, accessToken: $accessToken, limit: 100) {\n      projects {\n        id\n        name\n        status(accountId: $accountId)\n        linkedProject {\n          id\n        }\n        link {\n          __typename\n          type\n          ... on VercelApiProjectLinkGithub {\n            org\n            repo\n            repoId\n          }\n        }\n      }\n    }\n  }\n": types.VercelProjectsSummary_Me_VercelApiProjectsDocument,
    "\n  mutation VercelProjectsSummary_importGithubProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    importGithubProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n": types.VercelProjectsSummary_ImportGithubProjectDocument,
    "\n  mutation VercelProjectsSummary_setupVercelIntegration(\n    $input: SetupVercelIntegrationInput!\n  ) {\n    setupVercelIntegration(input: $input)\n  }\n": types.VercelProjectsSummary_SetupVercelIntegrationDocument,
    "\n  mutation Vercel_retrieveVercelToken($code: String!) {\n    retrieveVercelToken(code: $code) {\n      access_token\n      installation_id\n      user_id\n      team_id\n    }\n  }\n": types.Vercel_RetrieveVercelTokenDocument,
    "\n  mutation NewProject_importGithubProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    importGithubProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      slug\n    }\n  }\n": types.NewProject_ImportGithubProjectDocument,
    "\n  mutation NewProject_importGitlabProject(\n    $gitlabProjectId: ID!\n    $accountSlug: String!\n  ) {\n    importGitlabProject(\n      input: { gitlabProjectId: $gitlabProjectId, accountSlug: $accountSlug }\n    ) {\n      id\n      slug\n    }\n  }\n": types.NewProject_ImportGitlabProjectDocument,
    "\n  query AccountProjects_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          ...ProjectList_Project\n        }\n      }\n    }\n  }\n": types.AccountProjects_AccountDocument,
    "\n  query AccountSettings_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n\n      plan {\n        id\n        displayName\n      }\n\n      ...TeamMembers_Team\n      ...TeamDelete_Team\n      ...AccountChangeName_Account\n      ...AccountChangeSlug_Account\n      ...PlanCard_Account\n      ...AccountGitLab_Account\n      # ...AccountVercel_Account\n    }\n  }\n": types.AccountSettings_AccountDocument,
    "\n  query Account_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n      ...PaymentBanner_Account\n    }\n  }\n": types.Account_AccountDocument,
    "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    createdAt\n    branch\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    pullRequest {\n      merged\n    }\n  }\n": types.BuildDetail_BuildFragmentDoc,
    "\n  fragment BuildDiffState_ScreenshotDiff on ScreenshotDiff {\n    id\n    status\n    url\n    name\n    width\n    height\n    flakyDetected\n    group\n    test {\n      id\n      status\n      unstable\n      resolvedDate\n    }\n    baseScreenshot {\n      id\n      url\n      width\n      height\n      metadata {\n        url\n        colorScheme\n        mediaType\n        automationLibrary {\n          name\n          version\n        }\n        browser {\n          name\n          version\n        }\n        sdk {\n          name\n          version\n        }\n        viewport {\n          width\n          height\n        }\n        test {\n          id\n          title\n          titlePath\n          location {\n            file\n            line\n          }\n        }\n      }\n    }\n    compareScreenshot {\n      id\n      url\n      width\n      height\n      metadata {\n        url\n        colorScheme\n        mediaType\n        automationLibrary {\n          name\n          version\n        }\n        browser {\n          name\n          version\n        }\n        sdk {\n          name\n          version\n        }\n        viewport {\n          width\n          height\n        }\n        test {\n          id\n          title\n          titlePath\n          location {\n            file\n            line\n          }\n        }\n      }\n      playwrightTraceUrl\n    }\n  }\n": types.BuildDiffState_ScreenshotDiffFragmentDoc,
    "\n  query BuildDiffState_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            ...BuildDiffState_ScreenshotDiff\n          }\n        }\n      }\n    }\n  }\n": types.BuildDiffState_ProjectDocument,
    "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    commit\n    branch\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    pullRequest {\n      id\n      url\n      number\n    }\n  }\n": types.BuildInfos_BuildFragmentDoc,
    "\n  query BuildPage_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...BuildHeader_Project\n      ...BuildWorkspace_Project\n      account {\n        id\n        ...OvercapacityBanner_Account\n        ...PaymentBanner_Account\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n": types.BuildPage_ProjectDocument,
    "\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total\n    }\n  }\n": types.BuildSidebar_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    type\n    stats {\n      total\n      failure\n      changed\n      added\n      removed\n      unchanged\n    }\n  }\n": types.BuildWorkspace_BuildFragmentDoc,
    "\n  fragment BuildWorkspace_Project on Project {\n    ...BuildStatusDescription_Project\n    referenceBranch\n    slug\n    repository {\n      id\n      url\n    }\n  }\n": types.BuildWorkspace_ProjectFragmentDoc,
    "\n  fragment OvercapacityBanner_Account on Account {\n    plan {\n      id\n      displayName\n      usageBased\n    }\n    consumptionRatio\n  }\n": types.OvercapacityBanner_AccountFragmentDoc,
    "\n  fragment BuildHeader_Build on Build {\n    name\n    status\n    pullRequest {\n      id\n      ...PullRequestButton_PullRequest\n    }\n    ...BuildStatusChip_Build\n  }\n": types.BuildHeader_BuildFragmentDoc,
    "\n  fragment BuildHeader_Project on Project {\n    ...BuildStatusChip_Project\n    ...ReviewButton_Project\n    repository {\n      id\n      url\n    }\n  }\n": types.BuildHeader_ProjectFragmentDoc,
    "\n  query Invite_invitation($token: String!) {\n    invitation(token: $token) {\n      id\n      name\n      slug\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n\n    me {\n      id\n      teams {\n        id\n      }\n    }\n  }\n": types.Invite_InvitationDocument,
    "\n  mutation Invite_acceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n      slug\n    }\n  }\n": types.Invite_AcceptInvitationDocument,
    "\n  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      repository {\n        __typename\n        id\n        url\n      }\n      buildNames\n      ...GettingStarted_Project\n      ...BuildStatusChip_Project\n    }\n  }\n": types.ProjectBuilds_ProjectDocument,
    "\n  query ProjectBuilds_project_Builds(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n    $buildName: String\n  ) {\n    project(\n      accountSlug: $accountSlug\n      projectName: $projectName\n      buildName: $buildName\n    ) {\n      id\n      builds(first: $first, after: $after, buildName: $buildName) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          branch\n          commit\n          pullRequest {\n            id\n            ...PullRequestButton_PullRequest\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n": types.ProjectBuilds_Project_BuildsDocument,
    "\n  fragment GettingStarted_Project on Project {\n    token\n  }\n": types.GettingStarted_ProjectFragmentDoc,
    "\n  query ProjectReference_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      latestReferenceBuild {\n        id\n        number\n      }\n    }\n  }\n": types.ProjectReference_ProjectDocument,
    "\n  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...ProjectBadge_Project\n      ...ProjectChangeName_Project\n      ...ProjectToken_Project\n      ...ProjectReferenceBranch_Project\n      ...ProjectStatusChecks_Project\n      ...ProjectVisibility_Project\n      ...ProjectTransfer_Project\n      ...ProjectDelete_Project\n      ...ProjectGitRepository_Project\n      # ...ProjectVercel_Project\n    }\n  }\n": types.ProjectSettings_ProjectDocument,
    "\n  query Project_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      tests(first: 0, after: 0) {\n        pageInfo {\n          totalCount\n        }\n      }\n      account {\n        id\n        ...PaymentBanner_Account\n      }\n    }\n  }\n": types.Project_ProjectDocument,
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
export function graphql(source: "\n  fragment AccountChangeName_Account on Account {\n    id\n    name\n    slug\n  }\n"): (typeof documents)["\n  fragment AccountChangeName_Account on Account {\n    id\n    name\n    slug\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AccountChangeName_updateAccount($id: ID!, $name: String!) {\n    updateAccount(input: { id: $id, name: $name }) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation AccountChangeName_updateAccount($id: ID!, $name: String!) {\n    updateAccount(input: { id: $id, name: $name }) {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AccountChangeSlug_Account on Account {\n    id\n    slug\n  }\n"): (typeof documents)["\n  fragment AccountChangeSlug_Account on Account {\n    id\n    slug\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AccountChangeSlug_updateAccount($id: ID!, $slug: String!) {\n    updateAccount(input: { id: $id, slug: $slug }) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation AccountChangeSlug_updateAccount($id: ID!, $slug: String!) {\n    updateAccount(input: { id: $id, slug: $slug }) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AccountGitLab_Account on Account {\n    id\n    permissions\n    gitlabAccessToken\n  }\n"): (typeof documents)["\n  fragment AccountGitLab_Account on Account {\n    id\n    permissions\n    gitlabAccessToken\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AccountGitLab_updateAccount($id: ID!, $gitlabAccessToken: String) {\n    updateAccount(input: { id: $id, gitlabAccessToken: $gitlabAccessToken }) {\n      id\n      gitlabAccessToken\n    }\n  }\n"): (typeof documents)["\n  mutation AccountGitLab_updateAccount($id: ID!, $gitlabAccessToken: String) {\n    updateAccount(input: { id: $id, gitlabAccessToken: $gitlabAccessToken }) {\n      id\n      gitlabAccessToken\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AccountAvatarFragment on AccountAvatar {\n    url(size: 64)\n    color\n    initial\n  }\n"): (typeof documents)["\n  fragment AccountAvatarFragment on AccountAvatar {\n    url(size: 64)\n    color\n    initial\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AccountItem_Account on Account {\n    id\n    slug\n    name\n    avatar {\n      ...AccountAvatarFragment\n    }\n    ...AccountPlanChip_Account\n  }\n"): (typeof documents)["\n  fragment AccountItem_Account on Account {\n    id\n    slug\n    name\n    avatar {\n      ...AccountAvatarFragment\n    }\n    ...AccountPlanChip_Account\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AccountPlanChip_Account on Account {\n    subscriptionStatus\n    plan {\n      id\n      displayName\n    }\n  }\n"): (typeof documents)["\n  fragment AccountPlanChip_Account on Account {\n    subscriptionStatus\n    plan {\n      id\n      displayName\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountBreadcrumb_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n      ...AccountPlanChip_Account\n    }\n  }\n"): (typeof documents)["\n  query AccountBreadcrumb_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n      ...AccountPlanChip_Account\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment AccountBreadcrumbMenu_Account on Account {\n    id\n    slug\n    ...AccountItem_Account\n  }\n"): (typeof documents)["\n  fragment AccountBreadcrumbMenu_Account on Account {\n    id\n    slug\n    ...AccountItem_Account\n  }\n"];
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
export function graphql(source: "\n  fragment GithubInstallationsSelect_GhApiInstallation on GhApiInstallation {\n    id\n    account {\n      id\n      login\n      name\n    }\n  }\n"): (typeof documents)["\n  fragment GithubInstallationsSelect_GhApiInstallation on GhApiInstallation {\n    id\n    account {\n      id\n      login\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GithubRepositoryList_ghApiInstallationRepositories(\n    $installationId: ID!\n    $page: Int!\n    $reposPerPage: Int\n  ) {\n    ghApiInstallationRepositories(\n      installationId: $installationId\n      page: $page\n      reposPerPage: $reposPerPage\n    ) {\n      edges {\n        id\n        name\n        updated_at\n        owner_login\n      }\n      pageInfo {\n        hasNextPage\n        totalCount\n      }\n    }\n  }\n"): (typeof documents)["\n  query GithubRepositoryList_ghApiInstallationRepositories(\n    $installationId: ID!\n    $page: Int!\n    $reposPerPage: Int\n  ) {\n    ghApiInstallationRepositories(\n      installationId: $installationId\n      page: $page\n      reposPerPage: $reposPerPage\n    ) {\n      edges {\n        id\n        name\n        updated_at\n        owner_login\n      }\n      pageInfo {\n        hasNextPage\n        totalCount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment GitlabNamespacesSelect_GlApiNamespace on GlApiNamespace {\n    id\n    name\n    path\n  }\n"): (typeof documents)["\n  fragment GitlabNamespacesSelect_GlApiNamespace on GlApiNamespace {\n    id\n    name\n    path\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GitlabProjectList_glApiProjects(\n    $userId: ID\n    $groupId: ID\n    $allProjects: Boolean!\n    $accessToken: String!\n    $page: Int!\n    $search: String\n  ) {\n    glApiProjects(\n      userId: $userId\n      groupId: $groupId\n      allProjects: $allProjects\n      accessToken: $accessToken\n      page: $page\n      search: $search\n    ) {\n      edges {\n        id\n        name\n        last_activity_at\n      }\n      pageInfo {\n        hasNextPage\n      }\n    }\n  }\n"): (typeof documents)["\n  query GitlabProjectList_glApiProjects(\n    $userId: ID\n    $groupId: ID\n    $allProjects: Boolean!\n    $accessToken: String!\n    $page: Int!\n    $search: String\n  ) {\n    glApiProjects(\n      userId: $userId\n      groupId: $groupId\n      allProjects: $allProjects\n      accessToken: $accessToken\n      page: $page\n      search: $search\n    ) {\n      edges {\n        id\n        name\n        last_activity_at\n      }\n      pageInfo {\n        hasNextPage\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query NavUserControl_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n  }\n"): (typeof documents)["\n  query NavUserControl_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PaymentBanner_Account on Account {\n    id\n    subscriptionStatus\n    permissions\n    stripeCustomerId\n    pendingCancelAt\n\n    subscription {\n      id\n      trialDaysRemaining\n      provider\n      paymentMethodFilled\n    }\n  }\n"): (typeof documents)["\n  fragment PaymentBanner_Account on Account {\n    id\n    subscriptionStatus\n    permissions\n    stripeCustomerId\n    pendingCancelAt\n\n    subscription {\n      id\n      trialDaysRemaining\n      provider\n      paymentMethodFilled\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PaymentBanner_me {\n    me {\n      id\n      hasSubscribedToTrial\n    }\n  }\n"): (typeof documents)["\n  query PaymentBanner_me {\n    me {\n      id\n      hasSubscribedToTrial\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation terminateTrial($accountId: ID!) {\n    terminateTrial(accountId: $accountId) {\n      id\n      subscriptionStatus\n      __typename\n    }\n  }\n"): (typeof documents)["\n  mutation terminateTrial($accountId: ID!) {\n    terminateTrial(accountId: $accountId) {\n      id\n      subscriptionStatus\n      __typename\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PlanCard_Account on Account {\n    __typename\n    id\n    stripeCustomerId\n    periodStartDate\n    periodEndDate\n    subscriptionStatus\n    trialStatus\n    hasForcedPlan\n    pendingCancelAt\n    paymentProvider\n    includedScreenshots\n\n    plan {\n      id\n      displayName\n    }\n\n    subscription {\n      id\n      paymentMethodFilled\n    }\n\n    projects(first: 100, after: 0) {\n      edges {\n        id\n        name\n        public\n        currentPeriodScreenshots\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment PlanCard_Account on Account {\n    __typename\n    id\n    stripeCustomerId\n    periodStartDate\n    periodEndDate\n    subscriptionStatus\n    trialStatus\n    hasForcedPlan\n    pendingCancelAt\n    paymentProvider\n    includedScreenshots\n\n    plan {\n      id\n      displayName\n    }\n\n    subscription {\n      id\n      paymentMethodFilled\n    }\n\n    projects(first: 100, after: 0) {\n      edges {\n        id\n        name\n        public\n        currentPeriodScreenshots\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectBadge_Project on Project {\n    id\n    slug\n  }\n"): (typeof documents)["\n  fragment ProjectBadge_Project on Project {\n    id\n    slug\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectChangeName_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectChangeName_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectChangeName_updateProject($id: ID!, $name: String!) {\n    updateProject(input: { id: $id, name: $name }) {\n      id\n      name\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectChangeName_updateProject($id: ID!, $name: String!) {\n    updateProject(input: { id: $id, name: $name }) {\n      id\n      name\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ConnectRepository($accountSlug: String!) {\n    account(slug: $accountSlug) {\n      id\n      gitlabAccessToken\n      glNamespaces {\n        edges {\n          id\n          kind\n          ...GitlabNamespacesSelect_GlApiNamespace\n        }\n      }\n      permissions\n    }\n    me {\n      id\n      ghInstallations {\n        edges {\n          id\n          ...GithubInstallationsSelect_GhApiInstallation\n        }\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ConnectRepository($accountSlug: String!) {\n    account(slug: $accountSlug) {\n      id\n      gitlabAccessToken\n      glNamespaces {\n        edges {\n          id\n          kind\n          ...GitlabNamespacesSelect_GlApiNamespace\n        }\n      }\n      permissions\n    }\n    me {\n      id\n      ghInstallations {\n        edges {\n          id\n          ...GithubInstallationsSelect_GhApiInstallation\n        }\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteProjectMutation($projectId: ID!) {\n    deleteProject(id: $projectId)\n  }\n"): (typeof documents)["\n  mutation DeleteProjectMutation($projectId: ID!) {\n    deleteProject(id: $projectId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectDelete_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectDelete_Project on Project {\n    id\n    name\n    account {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectGitRepository_Project on Project {\n    id\n    account {\n      id\n      slug\n    }\n    repository {\n      __typename\n      id\n      fullName\n      url\n    }\n    prCommentEnabled\n  }\n"): (typeof documents)["\n  fragment ProjectGitRepository_Project on Project {\n    id\n    account {\n      id\n      slug\n    }\n    repository {\n      __typename\n      id\n      fullName\n      url\n    }\n    prCommentEnabled\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectGitRepository_linkGithubRepository(\n    $projectId: ID!\n    $repo: String!\n    $owner: String!\n  ) {\n    linkGithubRepository(\n      input: { projectId: $projectId, repo: $repo, owner: $owner }\n    ) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectGitRepository_linkGithubRepository(\n    $projectId: ID!\n    $repo: String!\n    $owner: String!\n  ) {\n    linkGithubRepository(\n      input: { projectId: $projectId, repo: $repo, owner: $owner }\n    ) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectGitRepository_unlinkGithubRepository($projectId: ID!) {\n    unlinkGithubRepository(input: { projectId: $projectId }) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectGitRepository_unlinkGithubRepository($projectId: ID!) {\n    unlinkGithubRepository(input: { projectId: $projectId }) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectGitRepository_linkGitlabProject(\n    $projectId: ID!\n    $gitlabProjectId: ID!\n  ) {\n    linkGitlabProject(\n      input: { projectId: $projectId, gitlabProjectId: $gitlabProjectId }\n    ) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectGitRepository_linkGitlabProject(\n    $projectId: ID!\n    $gitlabProjectId: ID!\n  ) {\n    linkGitlabProject(\n      input: { projectId: $projectId, gitlabProjectId: $gitlabProjectId }\n    ) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectGitRepository_unlinkGitlabProject($projectId: ID!) {\n    unlinkGitlabProject(input: { projectId: $projectId }) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectGitRepository_unlinkGitlabProject($projectId: ID!) {\n    unlinkGitlabProject(input: { projectId: $projectId }) {\n      id\n      ...ProjectGitRepository_Project\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectGitRepository_updateEnablePrComment(\n    $id: ID!\n    $enable: Boolean!\n  ) {\n    updateProjectPrComment(input: { id: $id, enable: $enable }) {\n      id\n      prCommentEnabled\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectGitRepository_updateEnablePrComment(\n    $id: ID!\n    $enable: Boolean!\n  ) {\n    updateProjectPrComment(input: { id: $id, enable: $enable }) {\n      id\n      prCommentEnabled\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectReferenceBranch_updateProject(\n    $id: ID!\n    $baselineBranch: String\n  ) {\n    updateProject(input: { id: $id, baselineBranch: $baselineBranch }) {\n      id\n      baselineBranch\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectReferenceBranch_updateProject(\n    $id: ID!\n    $baselineBranch: String\n  ) {\n    updateProject(input: { id: $id, baselineBranch: $baselineBranch }) {\n      id\n      baselineBranch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectReferenceBranch_Project on Project {\n    id\n    baselineBranch\n    repository {\n      __typename\n      id\n      defaultBranch\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectReferenceBranch_Project on Project {\n    id\n    baselineBranch\n    repository {\n      __typename\n      id\n      defaultBranch\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectStatusChecks_updateProject(\n    $id: ID!\n    $summaryCheck: SummaryCheck\n  ) {\n    updateProject(input: { id: $id, summaryCheck: $summaryCheck }) {\n      id\n      summaryCheck\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectStatusChecks_updateProject(\n    $id: ID!\n    $summaryCheck: SummaryCheck\n  ) {\n    updateProject(input: { id: $id, summaryCheck: $summaryCheck }) {\n      id\n      summaryCheck\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectStatusChecks_Project on Project {\n    id\n    summaryCheck\n  }\n"): (typeof documents)["\n  fragment ProjectStatusChecks_Project on Project {\n    id\n    summaryCheck\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectToken_Project on Project {\n    token\n  }\n"): (typeof documents)["\n  fragment ProjectToken_Project on Project {\n    token\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TransferProject_me {\n    me {\n      id\n      ...AccountItem_Account\n      teams {\n        id\n        ...AccountItem_Account\n      }\n    }\n  }\n"): (typeof documents)["\n  query TransferProject_me {\n    me {\n      id\n      ...AccountItem_Account\n      teams {\n        id\n        ...AccountItem_Account\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectTransfer_Account on Account {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectTransfer_Account on Account {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectTransfer_Review(\n    $projectId: ID!\n    $actualAccountId: ID!\n    $targetAccountId: ID!\n  ) {\n    projectById(id: $projectId) {\n      id\n      builds {\n        pageInfo {\n          totalCount\n        }\n      }\n      totalScreenshots\n    }\n\n    actualAccount: accountById(id: $actualAccountId) {\n      id\n      ...ProjectTransfer_Account\n      plan {\n        id\n        displayName\n      }\n    }\n\n    targetAccount: accountById(id: $targetAccountId) {\n      id\n      ...ProjectTransfer_Account\n      plan {\n        id\n        displayName\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProjectTransfer_Review(\n    $projectId: ID!\n    $actualAccountId: ID!\n    $targetAccountId: ID!\n  ) {\n    projectById(id: $projectId) {\n      id\n      builds {\n        pageInfo {\n          totalCount\n        }\n      }\n      totalScreenshots\n    }\n\n    actualAccount: accountById(id: $actualAccountId) {\n      id\n      ...ProjectTransfer_Account\n      plan {\n        id\n        displayName\n      }\n    }\n\n    targetAccount: accountById(id: $targetAccountId) {\n      id\n      ...ProjectTransfer_Account\n      plan {\n        id\n        displayName\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectTransfer_TransferProject(\n    $projectId: ID!\n    $targetAccountId: ID!\n    $name: String!\n  ) {\n    transferProject(\n      input: { id: $projectId, targetAccountId: $targetAccountId, name: $name }\n    ) {\n      id\n      name\n      account {\n        id\n        name\n        slug\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectTransfer_TransferProject(\n    $projectId: ID!\n    $targetAccountId: ID!\n    $name: String!\n  ) {\n    transferProject(\n      input: { id: $projectId, targetAccountId: $targetAccountId, name: $name }\n    ) {\n      id\n      name\n      account {\n        id\n        name\n        slug\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectTransfer_Project on Project {\n    id\n    name\n    slug\n    account {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectTransfer_Project on Project {\n    id\n    name\n    slug\n    account {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ProjectVisibility_updateProject($id: ID!, $private: Boolean) {\n    updateProject(input: { id: $id, private: $private }) {\n      id\n      private\n    }\n  }\n"): (typeof documents)["\n  mutation ProjectVisibility_updateProject($id: ID!, $private: Boolean) {\n    updateProject(input: { id: $id, private: $private }) {\n      id\n      private\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectVisibility_Project on Project {\n    id\n    private\n    repository {\n      __typename\n      id\n      private\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectVisibility_Project on Project {\n    id\n    private\n    repository {\n      __typename\n      id\n      private\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ProjectList_Project on Project {\n    id\n    name\n    slug\n    account {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n    repository {\n      __typename\n      id\n      fullName\n    }\n    latestBuild {\n      id\n      createdAt\n    }\n  }\n"): (typeof documents)["\n  fragment ProjectList_Project on Project {\n    id\n    name\n    slug\n    account {\n      id\n      slug\n      name\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n    repository {\n      __typename\n      id\n      fullName\n    }\n    latestBuild {\n      id\n      createdAt\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PullRequestStatusIcon_PullRequest on PullRequest {\n    draft\n    merged\n    state\n  }\n"): (typeof documents)["\n  fragment PullRequestStatusIcon_PullRequest on PullRequest {\n    draft\n    merged\n    state\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PullRequestInfo_PullRequest on PullRequest {\n    title\n    draft\n    merged\n    mergedAt\n    closedAt\n    state\n    number\n    date\n    url\n    ...PullRequestStatusIcon_PullRequest\n    ... on GithubPullRequest {\n      creator {\n        id\n        login\n        name\n      }\n    }\n  }\n"): (typeof documents)["\n  fragment PullRequestInfo_PullRequest on PullRequest {\n    title\n    draft\n    merged\n    mergedAt\n    closedAt\n    state\n    number\n    date\n    url\n    ...PullRequestStatusIcon_PullRequest\n    ... on GithubPullRequest {\n      creator {\n        id\n        login\n        name\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment PullRequestButton_PullRequest on PullRequest {\n    title\n    number\n    url\n    ...PullRequestStatusIcon_PullRequest\n    ...PullRequestInfo_PullRequest\n  }\n"): (typeof documents)["\n  fragment PullRequestButton_PullRequest on PullRequest {\n    title\n    number\n    url\n    ...PullRequestStatusIcon_PullRequest\n    ...PullRequestInfo_PullRequest\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment ReviewButton_Project on Project {\n    name\n    permissions\n    public\n    account {\n      id\n      slug\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  fragment ReviewButton_Project on Project {\n    name\n    permissions\n    public\n    account {\n      id\n      slug\n    }\n    build(number: $buildNumber) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"): (typeof documents)["\n  mutation setValidationStatus(\n    $buildId: ID!\n    $validationStatus: ValidationStatus!\n  ) {\n    setValidationStatus(\n      buildId: $buildId\n      validationStatus: $validationStatus\n    ) {\n      id\n      status\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment TeamDelete_Team on Team {\n    id\n    slug\n    subscriptionStatus\n    pendingCancelAt\n  }\n"): (typeof documents)["\n  fragment TeamDelete_Team on Team {\n    id\n    slug\n    subscriptionStatus\n    pendingCancelAt\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteTeamMutation($teamAccountId: ID!) {\n    deleteTeam(input: { accountId: $teamAccountId })\n  }\n"): (typeof documents)["\n  mutation DeleteTeamMutation($teamAccountId: ID!) {\n    deleteTeam(input: { accountId: $teamAccountId })\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeamMembers_teamMembers($id: ID!, $first: Int!, $after: Int!) {\n    team: teamById(id: $id) {\n      id\n      members(first: $first, after: $after) {\n        edges {\n          id\n          level\n          user {\n            id\n            name\n            slug\n            avatar {\n              ...AccountAvatarFragment\n            }\n            ...RemoveFromTeamDialog_User\n          }\n          ...LevelSelect_TeamMember\n        }\n        pageInfo {\n          hasNextPage\n          totalCount\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query TeamMembers_teamMembers($id: ID!, $first: Int!, $after: Int!) {\n    team: teamById(id: $id) {\n      id\n      members(first: $first, after: $after) {\n        edges {\n          id\n          level\n          user {\n            id\n            name\n            slug\n            avatar {\n              ...AccountAvatarFragment\n            }\n            ...RemoveFromTeamDialog_User\n          }\n          ...LevelSelect_TeamMember\n        }\n        pageInfo {\n          hasNextPage\n          totalCount\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment TeamMembers_Team on Team {\n    id\n    name\n    slug\n    inviteLink\n    me {\n      id\n      level\n      user {\n        id\n        name\n        slug\n        avatar {\n          ...AccountAvatarFragment\n        }\n        ...RemoveFromTeamDialog_User\n      }\n      ...LevelSelect_TeamMember\n    }\n  }\n"): (typeof documents)["\n  fragment TeamMembers_Team on Team {\n    id\n    name\n    slug\n    inviteLink\n    me {\n      id\n      level\n      user {\n        id\n        name\n        slug\n        avatar {\n          ...AccountAvatarFragment\n        }\n        ...RemoveFromTeamDialog_User\n      }\n      ...LevelSelect_TeamMember\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {\n    leaveTeam(input: { teamAccountId: $teamAccountId })\n  }\n"): (typeof documents)["\n  mutation TeamMembers_leaveTeam($teamAccountId: ID!) {\n    leaveTeam(input: { teamAccountId: $teamAccountId })\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation TeamMembers_removeUserFromTeam(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n  ) {\n    removeUserFromTeam(\n      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }\n    ) {\n      teamMemberId\n    }\n  }\n"): (typeof documents)["\n  mutation TeamMembers_removeUserFromTeam(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n  ) {\n    removeUserFromTeam(\n      input: { teamAccountId: $teamAccountId, userAccountId: $userAccountId }\n    ) {\n      teamMemberId\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment RemoveFromTeamDialog_User on User {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"): (typeof documents)["\n  fragment RemoveFromTeamDialog_User on User {\n    id\n    name\n    slug\n    avatar {\n      ...AccountAvatarFragment\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetTeamMemberLevelMutation(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n    $level: TeamUserLevel!\n  ) {\n    setTeamMemberLevel(\n      input: {\n        teamAccountId: $teamAccountId\n        userAccountId: $userAccountId\n        level: $level\n      }\n    ) {\n      id\n      level\n    }\n  }\n"): (typeof documents)["\n  mutation SetTeamMemberLevelMutation(\n    $teamAccountId: ID!\n    $userAccountId: ID!\n    $level: TeamUserLevel!\n  ) {\n    setTeamMemberLevel(\n      input: {\n        teamAccountId: $teamAccountId\n        userAccountId: $userAccountId\n        level: $level\n      }\n    ) {\n      id\n      level\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment LevelSelect_TeamMember on TeamMember {\n    id\n    level\n    user {\n      id\n    }\n  }\n"): (typeof documents)["\n  fragment LevelSelect_TeamMember on TeamMember {\n    id\n    level\n    user {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation NewTeam_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      redirectUrl\n    }\n  }\n"): (typeof documents)["\n  mutation NewTeam_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      redirectUrl\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query TeamNewForm_me {\n    me {\n      id\n      stripeCustomerId\n      hasSubscribedToTrial\n    }\n  }\n"): (typeof documents)["\n  query TeamNewForm_me {\n    me {\n      id\n      stripeCustomerId\n      hasSubscribedToTrial\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query UpgradeDialog_me {\n    me {\n      id\n      slug\n      hasSubscribedToTrial\n      ...AccountItem_Account\n      teams {\n        id\n        slug\n        hasPaidPlan\n        ...AccountItem_Account\n      }\n    }\n  }\n"): (typeof documents)["\n  query UpgradeDialog_me {\n    me {\n      id\n      slug\n      hasSubscribedToTrial\n      ...AccountItem_Account\n      teams {\n        id\n        slug\n        hasPaidPlan\n        ...AccountItem_Account\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Vercel_vercelApiTeam($id: ID!, $accessToken: String!) {\n    vercelApiTeam(id: $id, accessToken: $accessToken) {\n      id\n      name\n      slug\n    }\n  }\n"): (typeof documents)["\n  query Vercel_vercelApiTeam($id: ID!, $accessToken: String!) {\n    vercelApiTeam(id: $id, accessToken: $accessToken) {\n      id\n      name\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Vercel_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      team {\n        id\n        slug\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation Vercel_createTeam($name: String!) {\n    createTeam(input: { name: $name }) {\n      team {\n        id\n        slug\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  query VercelProjectsSummary_me_vercelApiProjects(\n    $teamId: ID\n    $accessToken: String!\n    $accountId: ID!\n  ) {\n    me {\n      id\n      ghInstallations {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n    vercelApiProjects(teamId: $teamId, accessToken: $accessToken, limit: 100) {\n      projects {\n        id\n        name\n        status(accountId: $accountId)\n        linkedProject {\n          id\n        }\n        link {\n          __typename\n          type\n          ... on VercelApiProjectLinkGithub {\n            org\n            repo\n            repoId\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query VercelProjectsSummary_me_vercelApiProjects(\n    $teamId: ID\n    $accessToken: String!\n    $accountId: ID!\n  ) {\n    me {\n      id\n      ghInstallations {\n        pageInfo {\n          totalCount\n        }\n      }\n    }\n    vercelApiProjects(teamId: $teamId, accessToken: $accessToken, limit: 100) {\n      projects {\n        id\n        name\n        status(accountId: $accountId)\n        linkedProject {\n          id\n        }\n        link {\n          __typename\n          type\n          ... on VercelApiProjectLinkGithub {\n            org\n            repo\n            repoId\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation VercelProjectsSummary_importGithubProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    importGithubProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation VercelProjectsSummary_importGithubProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    importGithubProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      name\n      account {\n        id\n        slug\n      }\n    }\n  }\n"];
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
export function graphql(source: "\n  mutation NewProject_importGithubProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    importGithubProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation NewProject_importGithubProject(\n    $repo: String!\n    $owner: String!\n    $accountSlug: String!\n  ) {\n    importGithubProject(\n      input: { repo: $repo, owner: $owner, accountSlug: $accountSlug }\n    ) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation NewProject_importGitlabProject(\n    $gitlabProjectId: ID!\n    $accountSlug: String!\n  ) {\n    importGitlabProject(\n      input: { gitlabProjectId: $gitlabProjectId, accountSlug: $accountSlug }\n    ) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation NewProject_importGitlabProject(\n    $gitlabProjectId: ID!\n    $accountSlug: String!\n  ) {\n    importGitlabProject(\n      input: { gitlabProjectId: $gitlabProjectId, accountSlug: $accountSlug }\n    ) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountProjects_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          ...ProjectList_Project\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query AccountProjects_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n      projects(first: 100, after: 0) {\n        edges {\n          id\n          ...ProjectList_Project\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccountSettings_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n\n      plan {\n        id\n        displayName\n      }\n\n      ...TeamMembers_Team\n      ...TeamDelete_Team\n      ...AccountChangeName_Account\n      ...AccountChangeSlug_Account\n      ...PlanCard_Account\n      ...AccountGitLab_Account\n      # ...AccountVercel_Account\n    }\n  }\n"): (typeof documents)["\n  query AccountSettings_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n\n      plan {\n        id\n        displayName\n      }\n\n      ...TeamMembers_Team\n      ...TeamDelete_Team\n      ...AccountChangeName_Account\n      ...AccountChangeSlug_Account\n      ...PlanCard_Account\n      ...AccountGitLab_Account\n      # ...AccountVercel_Account\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Account_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n      ...PaymentBanner_Account\n    }\n  }\n"): (typeof documents)["\n  query Account_account($slug: String!) {\n    account(slug: $slug) {\n      id\n      permissions\n      ...PaymentBanner_Account\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    createdAt\n    branch\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    pullRequest {\n      merged\n    }\n  }\n"): (typeof documents)["\n  fragment BuildDetail_Build on Build {\n    stats {\n      total\n    }\n    createdAt\n    branch\n    baseScreenshotBucket {\n      branch\n      createdAt\n    }\n    pullRequest {\n      merged\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildDiffState_ScreenshotDiff on ScreenshotDiff {\n    id\n    status\n    url\n    name\n    width\n    height\n    flakyDetected\n    group\n    test {\n      id\n      status\n      unstable\n      resolvedDate\n    }\n    baseScreenshot {\n      id\n      url\n      width\n      height\n      metadata {\n        url\n        colorScheme\n        mediaType\n        automationLibrary {\n          name\n          version\n        }\n        browser {\n          name\n          version\n        }\n        sdk {\n          name\n          version\n        }\n        viewport {\n          width\n          height\n        }\n        test {\n          id\n          title\n          titlePath\n          location {\n            file\n            line\n          }\n        }\n      }\n    }\n    compareScreenshot {\n      id\n      url\n      width\n      height\n      metadata {\n        url\n        colorScheme\n        mediaType\n        automationLibrary {\n          name\n          version\n        }\n        browser {\n          name\n          version\n        }\n        sdk {\n          name\n          version\n        }\n        viewport {\n          width\n          height\n        }\n        test {\n          id\n          title\n          titlePath\n          location {\n            file\n            line\n          }\n        }\n      }\n      playwrightTraceUrl\n    }\n  }\n"): (typeof documents)["\n  fragment BuildDiffState_ScreenshotDiff on ScreenshotDiff {\n    id\n    status\n    url\n    name\n    width\n    height\n    flakyDetected\n    group\n    test {\n      id\n      status\n      unstable\n      resolvedDate\n    }\n    baseScreenshot {\n      id\n      url\n      width\n      height\n      metadata {\n        url\n        colorScheme\n        mediaType\n        automationLibrary {\n          name\n          version\n        }\n        browser {\n          name\n          version\n        }\n        sdk {\n          name\n          version\n        }\n        viewport {\n          width\n          height\n        }\n        test {\n          id\n          title\n          titlePath\n          location {\n            file\n            line\n          }\n        }\n      }\n    }\n    compareScreenshot {\n      id\n      url\n      width\n      height\n      metadata {\n        url\n        colorScheme\n        mediaType\n        automationLibrary {\n          name\n          version\n        }\n        browser {\n          name\n          version\n        }\n        sdk {\n          name\n          version\n        }\n        viewport {\n          width\n          height\n        }\n        test {\n          id\n          title\n          titlePath\n          location {\n            file\n            line\n          }\n        }\n      }\n      playwrightTraceUrl\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildDiffState_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            ...BuildDiffState_ScreenshotDiff\n          }\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildDiffState_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n    $after: Int!\n    $first: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      build(number: $buildNumber) {\n        id\n        screenshotDiffs(after: $after, first: $first) {\n          pageInfo {\n            hasNextPage\n          }\n          edges {\n            ...BuildDiffState_ScreenshotDiff\n          }\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    commit\n    branch\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    pullRequest {\n      id\n      url\n      number\n    }\n  }\n"): (typeof documents)["\n  fragment BuildInfos_Build on Build {\n    createdAt\n    name\n    commit\n    branch\n    stats {\n      total\n    }\n    baseScreenshotBucket {\n      commit\n      branch\n    }\n    pullRequest {\n      id\n      url\n      number\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BuildPage_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...BuildHeader_Project\n      ...BuildWorkspace_Project\n      account {\n        id\n        ...OvercapacityBanner_Account\n        ...PaymentBanner_Account\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"): (typeof documents)["\n  query BuildPage_Project(\n    $accountSlug: String!\n    $projectName: String!\n    $buildNumber: Int!\n  ) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...BuildHeader_Project\n      ...BuildWorkspace_Project\n      account {\n        id\n        ...OvercapacityBanner_Account\n        ...PaymentBanner_Account\n      }\n      build(number: $buildNumber) {\n        id\n        status\n        ...BuildHeader_Build\n        ...BuildWorkspace_Build\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total\n    }\n  }\n"): (typeof documents)["\n  fragment BuildSidebar_Build on Build {\n    ...BuildInfos_Build\n    stats {\n      total\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    type\n    stats {\n      total\n      failure\n      changed\n      added\n      removed\n      unchanged\n    }\n  }\n"): (typeof documents)["\n  fragment BuildWorkspace_Build on Build {\n    ...BuildSidebar_Build\n    ...BuildStatusDescription_Build\n    ...BuildDetail_Build\n    status\n    type\n    stats {\n      total\n      failure\n      changed\n      added\n      removed\n      unchanged\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildWorkspace_Project on Project {\n    ...BuildStatusDescription_Project\n    referenceBranch\n    slug\n    repository {\n      id\n      url\n    }\n  }\n"): (typeof documents)["\n  fragment BuildWorkspace_Project on Project {\n    ...BuildStatusDescription_Project\n    referenceBranch\n    slug\n    repository {\n      id\n      url\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment OvercapacityBanner_Account on Account {\n    plan {\n      id\n      displayName\n      usageBased\n    }\n    consumptionRatio\n  }\n"): (typeof documents)["\n  fragment OvercapacityBanner_Account on Account {\n    plan {\n      id\n      displayName\n      usageBased\n    }\n    consumptionRatio\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Build on Build {\n    name\n    status\n    pullRequest {\n      id\n      ...PullRequestButton_PullRequest\n    }\n    ...BuildStatusChip_Build\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Build on Build {\n    name\n    status\n    pullRequest {\n      id\n      ...PullRequestButton_PullRequest\n    }\n    ...BuildStatusChip_Build\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment BuildHeader_Project on Project {\n    ...BuildStatusChip_Project\n    ...ReviewButton_Project\n    repository {\n      id\n      url\n    }\n  }\n"): (typeof documents)["\n  fragment BuildHeader_Project on Project {\n    ...BuildStatusChip_Project\n    ...ReviewButton_Project\n    repository {\n      id\n      url\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Invite_invitation($token: String!) {\n    invitation(token: $token) {\n      id\n      name\n      slug\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n\n    me {\n      id\n      teams {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  query Invite_invitation($token: String!) {\n    invitation(token: $token) {\n      id\n      name\n      slug\n      avatar {\n        ...AccountAvatarFragment\n      }\n    }\n\n    me {\n      id\n      teams {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Invite_acceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n      slug\n    }\n  }\n"): (typeof documents)["\n  mutation Invite_acceptInvitation($token: String!) {\n    acceptInvitation(token: $token) {\n      id\n      slug\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      repository {\n        __typename\n        id\n        url\n      }\n      buildNames\n      ...GettingStarted_Project\n      ...BuildStatusChip_Project\n    }\n  }\n"): (typeof documents)["\n  query ProjectBuilds_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      repository {\n        __typename\n        id\n        url\n      }\n      buildNames\n      ...GettingStarted_Project\n      ...BuildStatusChip_Project\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectBuilds_project_Builds(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n    $buildName: String\n  ) {\n    project(\n      accountSlug: $accountSlug\n      projectName: $projectName\n      buildName: $buildName\n    ) {\n      id\n      builds(first: $first, after: $after, buildName: $buildName) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          branch\n          commit\n          pullRequest {\n            id\n            ...PullRequestButton_PullRequest\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProjectBuilds_project_Builds(\n    $accountSlug: String!\n    $projectName: String!\n    $after: Int!\n    $first: Int!\n    $buildName: String\n  ) {\n    project(\n      accountSlug: $accountSlug\n      projectName: $projectName\n      buildName: $buildName\n    ) {\n      id\n      builds(first: $first, after: $after, buildName: $buildName) {\n        pageInfo {\n          totalCount\n          hasNextPage\n        }\n        edges {\n          id\n          number\n          createdAt\n          name\n          branch\n          commit\n          pullRequest {\n            id\n            ...PullRequestButton_PullRequest\n          }\n          ...BuildStatusChip_Build\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment GettingStarted_Project on Project {\n    token\n  }\n"): (typeof documents)["\n  fragment GettingStarted_Project on Project {\n    token\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectReference_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      latestReferenceBuild {\n        id\n        number\n      }\n    }\n  }\n"): (typeof documents)["\n  query ProjectReference_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      latestReferenceBuild {\n        id\n        number\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...ProjectBadge_Project\n      ...ProjectChangeName_Project\n      ...ProjectToken_Project\n      ...ProjectReferenceBranch_Project\n      ...ProjectStatusChecks_Project\n      ...ProjectVisibility_Project\n      ...ProjectTransfer_Project\n      ...ProjectDelete_Project\n      ...ProjectGitRepository_Project\n      # ...ProjectVercel_Project\n    }\n  }\n"): (typeof documents)["\n  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      ...ProjectBadge_Project\n      ...ProjectChangeName_Project\n      ...ProjectToken_Project\n      ...ProjectReferenceBranch_Project\n      ...ProjectStatusChecks_Project\n      ...ProjectVisibility_Project\n      ...ProjectTransfer_Project\n      ...ProjectDelete_Project\n      ...ProjectGitRepository_Project\n      # ...ProjectVercel_Project\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Project_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      tests(first: 0, after: 0) {\n        pageInfo {\n          totalCount\n        }\n      }\n      account {\n        id\n        ...PaymentBanner_Account\n      }\n    }\n  }\n"): (typeof documents)["\n  query Project_project($accountSlug: String!, $projectName: String!) {\n    project(accountSlug: $accountSlug, projectName: $projectName) {\n      id\n      permissions\n      tests(first: 0, after: 0) {\n        pageInfo {\n          totalCount\n        }\n      }\n      account {\n        id\n        ...PaymentBanner_Account\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;