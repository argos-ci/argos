import { PlusIcon } from "lucide-react";

import { CreateWebhookDialog } from "@/containers/Webhook/CreateWebhookDialog";
import { WebhookList } from "@/containers/Webhook/WebhookList";
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
  fragment AccountWebhooks_Account on Account {
    id
    webhooks {
      id
      ...WebhookList_Webhook
    }
    accountProjects: projects(first: 1000, after: 0) {
      edges {
        id
        name
      }
    }
  }
`);

export function AccountWebhooks(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  // Only administrators of the account see its webhooks.
  if (!account.webhooks) {
    return null;
  }
  return (
    <Card>
      <CardBody>
        <CardTitle>Webhooks</CardTitle>
        <CardParagraph>
          Argos sends a <Code>POST</Code> request to your endpoints when a build
          completes or gets reviewed, and when a deployment is created or ready.
          Each request is signed with the webhook secret, so you can check it
          comes from Argos.
        </CardParagraph>
        {account.webhooks.length > 0 && (
          <div className="overflow-auto">
            <WebhookList webhooks={account.webhooks} />
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div>
          Learn more about{" "}
          <Link href="https://argos-ci.com/docs/webhooks" target="_blank">
            webhooks
          </Link>
          .
        </div>
        <DialogTrigger>
          <Button variant="secondary">
            <ButtonIcon>
              <PlusIcon />
            </ButtonIcon>
            Add webhook
          </Button>
          <Modal>
            <CreateWebhookDialog
              accountId={account.id}
              projects={account.accountProjects.edges}
            />
          </Modal>
        </DialogTrigger>
      </CardFooter>
    </Card>
  );
}
