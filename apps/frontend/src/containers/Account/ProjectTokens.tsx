import { PlusIcon } from "lucide-react";

import { CreateProjectTokenDialog } from "@/containers/ProjectToken/CreateProjectTokenDialog";
import { ProjectTokenList } from "@/containers/ProjectToken/ProjectTokenList";
import { DocumentType, graphql } from "@/gql";
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

const _AccountFragment = graphql(`
  fragment AccountProjectTokens_Account on Account {
    id
    projectTokens {
      id
      ...ProjectTokenList_ProjectToken
    }
    projects(first: 100, after: 0) {
      edges {
        id
        name
      }
    }
  }
`);

export function AccountProjectTokens(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  // Only administrators of the account see its tokens.
  if (!account.projectTokens) {
    return null;
  }
  const projects = account.projects.edges;
  return (
    <Card>
      <CardBody>
        <CardTitle>Project tokens</CardTitle>
        <CardParagraph>
          CI and the SDK authenticate with a project token, set as{" "}
          <Code>ARGOS_TOKEN</Code>. A token can be linked to several projects
          and limited to some permissions.
        </CardParagraph>
        <CardParagraph>
          To rotate a token without downtime, create its replacement, update the
          secret in your CI, then revoke the old one once its <em>last used</em>{" "}
          date stops moving.
        </CardParagraph>
        {account.projectTokens.length > 0 && (
          <div className="overflow-auto">
            <ProjectTokenList tokens={account.projectTokens} />
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div>
          Read{" "}
          <Link href="https://argos-ci.com/docs" target="_blank">
            Argos documentation
          </Link>{" "}
          to set up your CI.
        </div>
        {projects.length > 0 && (
          <DialogTrigger>
            <Button variant="secondary">
              <ButtonIcon>
                <PlusIcon />
              </ButtonIcon>
              Create token
            </Button>
            <Modal>
              <CreateProjectTokenDialog
                accountId={account.id}
                projects={projects}
              />
            </Modal>
          </DialogTrigger>
        )}
      </CardFooter>
    </Card>
  );
}
