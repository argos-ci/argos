import { FragmentType, graphql, useFragment } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Link } from "@/ui/Link";

import { ProjectContributorLevelLabel } from "../ProjectContributor";
import { ProjectContributorsAdd } from "./Contributors/AddProjectContributor";
import { ProjectContributorsList } from "./Contributors/ProjectContributorsList";
import { ProjectDefaultUserLevel } from "./Contributors/ProjectDefaultUserLevel";
import { ProjectTeamMembersList } from "./Contributors/ProjectTeamMembersList";

const ProjectFragment = graphql(`
  fragment ProjectContributors_Project on Project {
    id
    name
    account {
      id
    }
    permissions
    defaultUserLevel
    ...ProjectDefaultUserLevel_Project
  }
`);

export function ProjectContributors(props: {
  project: FragmentType<typeof ProjectFragment>;
}) {
  const project = useFragment(ProjectFragment, props.project);
  const hasAdminPermission = project.permissions.includes(
    ProjectPermission.Admin,
  );
  return (
    <Card>
      <CardBody>
        <CardTitle>Access management</CardTitle>
        <CardParagraph>
          Select which team members can access this project and determine their
          level of access.
        </CardParagraph>
        {project.defaultUserLevel && (
          <div className="rounded border p-2 text-sm">
            The default access level for new contributors is set to{" "}
            <strong>
              {ProjectContributorLevelLabel[project.defaultUserLevel]}
            </strong>
            .<br />
            All team members with role "contributors" with access to this
            project will have this level by default.
          </div>
        )}
        <ProjectContributorsList
          readOnly={!hasAdminPermission}
          projectId={project.id}
          projectName={project.name}
        />
        <ProjectTeamMembersList
          projectId={project.id}
          teamAccountId={project.account.id}
        />
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        {hasAdminPermission ? (
          <>
            <div>
              Learn more about{" "}
              <Link
                href="https://argos-ci.com/docs/team-members-and-roles"
                target="_blank"
              >
                access control management
              </Link>
              .
            </div>
            <div className="flex gap-2">
              <ProjectDefaultUserLevel project={project} />
              <ProjectContributorsAdd
                projectId={project.id}
                teamAccountId={project.account.id}
              />
            </div>
          </>
        ) : (
          <div>
            Only a project admin add contributor or change access level.
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
