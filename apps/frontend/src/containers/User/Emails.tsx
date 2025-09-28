import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { MoreVerticalIcon, PlusIcon } from "lucide-react";
import { DialogTrigger, MenuTrigger } from "react-aria-components";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { useDialogValueState } from "@/ui/Dialog";
import { IconButton } from "@/ui/IconButton";
import { List, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuItemTooltip } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { getErrorMessage } from "@/util/error";

import { AddUserEmailDialog } from "./emails/AddUserEmailDialog";
import { DeleteUserEmailDialog } from "./emails/DeleteUserEmailDialog";
import { SendUserEmailVerificationButton } from "./emails/SendUserEmailVerificationButton";

const _AccountFragment = graphql(`
  fragment UserEmail_Account on User {
    id
    email
    emails {
      email
      verified
    }
  }
`);

const SetPrimaryEmailMutation = graphql(`
  mutation SetPrimaryEmailMutation($email: String!) {
    setPrimaryEmail(email: $email) {
      id
      email
    }
  }
`);

export function UserEmails(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  invariant(account.__typename === "User");
  // Put primary email first, then verified, then others
  const sortedEmails = Array.from(account.emails).sort((a, b) => {
    // Primary email first
    if (a.email === account.email && b.email !== account.email) {
      return -1;
    }
    if (b.email === account.email && a.email !== account.email) {
      return 1;
    }
    // Verified before unverified
    if (a.verified && !b.verified) {
      return -1;
    }
    if (!a.verified && b.verified) {
      return 1;
    }
    // Otherwise, sort alphabetically
    return a.email.localeCompare(b.email);
  });
  const deleting = useDialogValueState<string | null>(null);
  const client = useApolloClient();
  return (
    <Card>
      <CardBody>
        <CardTitle>Emails</CardTitle>
        <CardParagraph>
          Enter the email addresses you want to use to log in with Argos. Your
          primary email will be used for account-related notifications.
        </CardParagraph>
        <List className="mb-4">
          {sortedEmails.map((email) => {
            const isPrimary = email.email === account.email;
            return (
              <ListRow
                key={email.email}
                className="flex items-center justify-between gap-6 p-4 text-sm"
              >
                <div className="flex items-center gap-4">
                  {email.email}
                  <div className="flex gap-2">
                    {email.verified ? (
                      <Chip scale="sm" color="info">
                        Verified
                      </Chip>
                    ) : (
                      <Chip scale="sm" color="neutral">
                        Unverified
                      </Chip>
                    )}
                    {isPrimary ? (
                      <Chip scale="sm" color="success">
                        Primary
                      </Chip>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {!email.verified ? (
                    <SendUserEmailVerificationButton email={email.email} />
                  ) : null}
                  <MenuTrigger>
                    <IconButton>
                      <MoreVerticalIcon />
                    </IconButton>
                    <Popover>
                      <Menu aria-label="Actions">
                        {!isPrimary && (
                          <MenuItem
                            isDisabled={!email.verified}
                            onAction={() => {
                              client
                                .mutate({
                                  mutation: SetPrimaryEmailMutation,
                                  variables: { email: email.email },
                                  optimisticResponse: {
                                    setPrimaryEmail: {
                                      __typename: "User",
                                      id: account.id,
                                      email: email.email,
                                    },
                                  },
                                })
                                .catch((error) => {
                                  toast.error(getErrorMessage(error));
                                });
                            }}
                          >
                            {!email.verified && (
                              <MenuItemTooltip content="Verify email before setting as primary" />
                            )}
                            Set as primary
                          </MenuItem>
                        )}
                        <MenuItem
                          variant="danger"
                          isDisabled={isPrimary}
                          onAction={() => {
                            deleting.open(email.email);
                          }}
                        >
                          {isPrimary && (
                            <MenuItemTooltip content="Primary email cannot be deleted" />
                          )}
                          Delete
                        </MenuItem>
                      </Menu>
                    </Popover>
                  </MenuTrigger>
                </div>
              </ListRow>
            );
          })}
        </List>
        <DialogTrigger>
          <Button variant="secondary">
            <ButtonIcon>
              <PlusIcon />
            </ButtonIcon>
            Add other
          </Button>
          <Modal>
            <AddUserEmailDialog />
          </Modal>
        </DialogTrigger>
      </CardBody>
      <CardFooter>
        Emails must be verified to be able to login with them or be used as
        primary email.
      </CardFooter>
      {deleting.value ? (
        <Modal isOpen={deleting.isOpen} onOpenChange={deleting.onOpenChange}>
          <DeleteUserEmailDialog email={deleting.value} />
        </Modal>
      ) : null}
    </Card>
  );
}
