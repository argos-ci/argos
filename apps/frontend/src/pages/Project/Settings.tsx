import {
  Children,
  Fragment,
  isValidElement,
  Suspense,
  type ReactNode,
} from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { useFlag } from "@reflag/react-sdk";
import { Heading, Text } from "react-aria-components";
import { Navigate, Route, Routes } from "react-router-dom";

import { SettingsLayout, SettingsPage } from "@/containers/Layout";
import { ProjectBadge } from "@/containers/Project/Badge";
import { ProjectBranches } from "@/containers/Project/Branches";
import { ProjectChangeName } from "@/containers/Project/ChangeName";
import { ProjectContributors } from "@/containers/Project/Contributors";
import { ProjectDelete } from "@/containers/Project/Delete";
import { ProjectDeployments } from "@/containers/Project/Deployments/Deployments";
import { ProjectGitHubActionsOIDC } from "@/containers/Project/GitHubActionsOIDC";
import { ProjectGitRepository } from "@/containers/Project/GitRepository";
import { ProjectIgnore } from "@/containers/Project/Ignore";
import { ProjectStatusChecks } from "@/containers/Project/StatusChecks";
import { ProjectToken } from "@/containers/Project/Token";
import { ProjectTokenlessAuth } from "@/containers/Project/TokenlessAuth";
import { ProjectTransfer } from "@/containers/Project/Transfer";
import { ProjectVisibility } from "@/containers/Project/Visibility";
import { graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { NotFound } from "@/pages/NotFound";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Nav, NavLink, NavList, NavListItem } from "@/ui/Nav";
import { PageLoader } from "@/ui/PageLoader";
import { useScrollToHash } from "@/ui/useScrollToHash";

import { useProjectOutletContext } from "./ProjectOutletContext";
import { getProjectURL, useProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectQuery = graphql(`
  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {
    account(slug: $accountSlug) {
      id
      ... on Team {
        plan {
          id
          fineGrainedAccessControlIncluded
        }
      }
    }

    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      ...ProjectBadge_Project
      ...ProjectChangeName_Project
      ...ProjectDeployments_Project
      ...ProjectToken_Project
      ...ProjectBranches_Project
      ...ProjectStatusChecks_Project
      ...ProjectIgnore_Project
      ...ProjectVisibility_Project
      ...ProjectTransfer_Project
      ...ProjectDelete_Project
      ...ProjectGitRepository_Project
      ...ProjectContributors_Project
      ...ProjectGitHubActionsOIDC_Project
      ...ProjectTokenlessAuth_Project
    }
  }
`);

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const { permissions } = useProjectOutletContext();

  const hasViewSettingsPermission = permissions.includes(
    ProjectPermission.ViewSettings,
  );

  if (!hasViewSettingsPermission) {
    return <NotFound />;
  }

  return (
    <Page>
      <ProjectTitle params={params}>Settings</ProjectTitle>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>Project Settings</Heading>
            <Text slot="headline">
              Configure the settings for this project.
            </Text>
          </PageHeaderContent>
        </PageHeader>
        <Suspense
          fallback={
            <SettingsPage>
              <PageLoader />
            </SettingsPage>
          }
        >
          <PageContent />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function PageContent() {
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const { accountSlug, projectName } = params;
  const { permissions } = useProjectOutletContext();
  const deploymentsFlag = useFlag("deployments");
  const {
    data: { account, project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: { accountSlug, projectName },
  });
  useScrollToHash();

  if (!project || !account) {
    return <NotFound />;
  }

  const hasAdminPermission = permissions.includes(ProjectPermission.Admin);
  const hasReviewPermission = permissions.includes(ProjectPermission.Review);

  const isTeam = account.__typename === "Team";
  const fineGrainedAccessControlIncluded = Boolean(
    isTeam && account.plan?.fineGrainedAccessControlIncluded,
  );

  const settingsUrl = `${getProjectURL(params)}/settings`;

  const routes = [
    {
      name: "General",
      slug: "",
      element: (
        <>
          {hasAdminPermission && <ProjectChangeName project={project} />}
          <ProjectBadge project={project} />
          {hasAdminPermission && <ProjectTransfer project={project} />}
          {hasAdminPermission && <ProjectDelete project={project} />}
        </>
      ),
    },
    {
      name: "Authentication",
      slug: "authentication",
      element: (
        <>
          {hasReviewPermission && <ProjectToken project={project} />}
          {hasAdminPermission && <ProjectTokenlessAuth project={project} />}
          {hasAdminPermission && <ProjectGitHubActionsOIDC project={project} />}
        </>
      ),
    },
    {
      name: "Access management",
      slug: "access-management",
      element: (
        <>
          {hasAdminPermission && <ProjectVisibility project={project} />}
          {fineGrainedAccessControlIncluded && (
            <ProjectContributors project={project} />
          )}
        </>
      ),
    },
    {
      name: "Git",
      slug: "git",
      element: hasAdminPermission && (
        <>
          <ProjectGitRepository project={project} />
          <ProjectStatusChecks project={project} />
        </>
      ),
    },
    {
      name: "Baseline builds",
      slug: "baseline-builds",
      element: hasAdminPermission && <ProjectBranches project={project} />,
    },
    {
      name: "Flaky detection",
      slug: "flaky-detection",
      element: hasAdminPermission && <ProjectIgnore project={project} />,
    },
    {
      name: "Deployments",
      slug: "deployments",
      element: hasAdminPermission && deploymentsFlag.isEnabled && (
        <ProjectDeployments project={project} isTeam={isTeam} />
      ),
    },
  ];

  const matchedRoutes = routes.filter((route) =>
    checkIsNonEmptyElement(route.element),
  );

  return (
    <SettingsLayout>
      <Nav>
        <NavList>
          {matchedRoutes.map((route, index) => (
            <NavListItem key={route.slug}>
              <NavLink
                to={`${settingsUrl}${index > 0 && route.slug ? `/${route.slug}` : ""}`}
                end
              >
                {route.name}
              </NavLink>
            </NavListItem>
          ))}
        </NavList>
      </Nav>
      <SettingsPage>
        <Routes>
          {matchedRoutes.map((route, index) => {
            return (
              <Route
                key={route.slug}
                index={index === 0}
                path={index === 0 ? "" : route.slug}
                element={route.element}
              />
            );
          })}
          <Route path="*" element={<Navigate to={settingsUrl} replace />} />
        </Routes>
      </SettingsPage>
    </SettingsLayout>
  );
}

function checkIsNonEmptyElement(element: ReactNode): boolean {
  if (!element) {
    return false;
  }
  if (
    isValidElement<{ children?: ReactNode }>(element) &&
    element.type === Fragment
  ) {
    return Children.toArray(element.props.children).some(
      checkIsNonEmptyElement,
    );
  }
  return true;
}
