import { PlusIcon } from "lucide-react";

import { CreateProjectTokenDialog } from "@/containers/ProjectToken/CreateProjectTokenDialog";
import { ProjectTokenList } from "@/containers/ProjectToken/ProjectTokenList";
import { DocumentType, graphql } from "@/gql";
import { AccountPermission, ProjectPermission } from "@/gql/graphql";
import { useProjectOutletContext } from "@/pages/Project/ProjectOutletContext";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Code } from "@/ui/Code";
import { DialogTrigger } from "@/ui/Dialog";
import { Link } from "@/ui/Link";
import { Modal } from "@/ui/Modal";

const _ProjectFragment = graphql(`
  fragment ProjectToken_Project on Project {
    id
    name
    tokens {
      id
      ...ProjectTokenList_ProjectToken
    }
    account {
      id
      slug
      permissions
    }
  }
`);

export function ProjectToken(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const { permissions } = useProjectOutletContext();

  // Only reviewers and administrators see the project's tokens.
  if (!project.tokens) {
    return null;
  }

  const canCreate = permissions.includes(ProjectPermission.Admin);
  const isAccountAdmin = project.account.permissions.includes(
    AccountPermission.Admin,
  );
  const accountSettings =
    project.account.__typename === "Team"
      ? "team settings"
      : "personal settings";

  return (
    <Card>
      <CardBody>
        <CardTitle>Project tokens</CardTitle>
        <CardParagraph>
          Set a project token as <Code>ARGOS_TOKEN</Code> to authenticate your
          project when you send screenshots to Argos.{" "}
          <strong>Keep it secret.</strong>
        </CardParagraph>
        <CardParagraph>
          To rotate a token without downtime, create its replacement, update the
          secret in your CI, then revoke the old one.
        </CardParagraph>
        {project.tokens.length > 0 && (
          <div className="overflow-auto">
            <ProjectTokenList tokens={project.tokens} projectId={project.id} />
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div>
          {isAccountAdmin ? (
            <>
              Manage tokens linked to several projects in{" "}
              <Link href={`/${project.account.slug}/settings/tokens`}>
                {accountSettings}
              </Link>
              .
            </>
          ) : (
            <>
              Read{" "}
              <Link href="https://argos-ci.com/docs" target="_blank">
                Argos documentation
              </Link>{" "}
              for more information about installing and using it.
            </>
          )}
        </div>
        {canCreate && (
          <DialogTrigger>
            <Button variant="secondary">
              <ButtonIcon>
                <PlusIcon />
              </ButtonIcon>
              Create token
            </Button>
            <Modal>
              <CreateProjectTokenDialog
                accountId={project.account.id}
                projects={[{ id: project.id, name: project.name }]}
              />
            </Modal>
          </DialogTrigger>
        )}
      </CardFooter>
    </Card>
  );
}
