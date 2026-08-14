import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button as RACButton } from "react-aria-components";
import { useForm } from "react-hook-form";

import {
  CEREMONY_CANCELLED_MESSAGE,
  checkIsCeremonyCancelled,
  checkPasskeysSupported,
  PasskeyIcon,
  useRegisterPasskey,
} from "@/containers/Passkey";
import { DocumentType, graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Dialog,
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
  useDialogValueState,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";
import { PASSKEY_NAME_MAX_LENGTH } from "@/util/passkey";

import { ProviderCard, ProviderContent, ProviderIcon } from "../ui";

const _AccountFragment = graphql(`
  fragment PasskeyAuth_Account on User {
    id
    passkeys {
      id
      name
      createdAt
      lastUsedAt
      synced
    }
  }
`);

type Passkey = DocumentType<typeof _AccountFragment>["passkeys"][number];

const UpdatePasskeyMutation = graphql(`
  mutation PasskeyAuth_updatePasskey($id: ID!, $name: String!) {
    updatePasskey(input: { id: $id, name: $name }) {
      id
      name
    }
  }
`);

const DeletePasskeyMutation = graphql(`
  mutation PasskeyAuth_deletePasskey($id: ID!) {
    deletePasskey(input: { id: $id }) {
      id
      ...PasskeyAuth_Account
    }
  }
`);

/**
 * Explains what is about to happen before the OS prompt takes over the screen,
 * and gives the user somewhere to retry from if the authenticator refuses.
 *
 * The registration is driven from `onAsyncAction` so the modal stays
 * undismissable while the browser prompt is up.
 */
function CreatePasskeyDialog() {
  const state = useOverlayTriggerState();
  const registerPasskey = useRegisterPasskey();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Create Passkey</DialogTitle>
        <DialogText>
          Passkeys are a simple and secure way to authenticate using biometrics,
          a hardware key, or PIN.
        </DialogText>
        <div className="my-6 flex justify-center">
          <div className="bg-subtle flex size-16 items-center justify-center rounded-xl border">
            <PasskeyIcon className="text-low size-7" />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        {error ? <ErrorMessage className="flex-1">{error}</ErrorMessage> : null}
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          onAsyncAction={async () => {
            setError(null);
            try {
              await registerPasskey();
            } catch (caught) {
              // A dismissed or timed-out prompt is not a failure of ours, but
              // the dialog is still open and the user needs to know why nothing
              // happened — so it is shown here rather than swallowed, with the
              // same wording the login button uses.
              if (checkIsCeremonyCancelled(caught)) {
                setError(CEREMONY_CANCELLED_MESSAGE);
                return;
              }
              setError(getErrorMessage(caught));
              return;
            }
            state.close();
            toast.success("Passkey added", { id: "passkey-added" });
          }}
        >
          {error ? "Retry" : "Continue"}
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}

function EditPasskeyDialog(props: { passkey: Passkey }) {
  const { passkey } = props;
  const state = useOverlayTriggerState();
  const [updatePasskey] = useMutation(UpdatePasskeyMutation);
  const form = useForm({ defaultValues: { name: passkey.name } });

  return (
    <Dialog size="medium">
      <Form
        form={form}
        onSubmit={async (data) => {
          await updatePasskey({
            variables: { id: passkey.id, name: data.name },
          });
          state.close();
          toast.success("Passkey renamed", { id: "passkey-renamed" });
        }}
      >
        <DialogBody>
          <DialogTitle>Edit Passkey</DialogTitle>
          <FormTextInput
            control={form.control}
            {...form.register("name", {
              required: "Device name is required",
              maxLength: {
                value: PASSKEY_NAME_MAX_LENGTH,
                message: `Device name must be ${PASSKEY_NAME_MAX_LENGTH} characters or less`,
              },
            })}
            autoFocus
            label="Device Name"
          />
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control} disableIfPristine>
            Save
          </FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

function DeletePasskeyDialog(props: { passkey: Passkey }) {
  const { passkey } = props;
  const state = useOverlayTriggerState();
  const [deletePasskey, { error }] = useMutation(DeletePasskeyMutation, {
    variables: { id: passkey.id },
  });

  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Delete Passkey</DialogTitle>
        <DialogText>
          The passkey <strong>{passkey.name}</strong> will be deleted, are you
          sure you want to continue?
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error ? (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        ) : null}
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant="destructive"
          onAsyncAction={async () => {
            await deletePasskey();
            state.close();
            toast.success("Passkey deleted", { id: "passkey-deleted" });
          }}
        >
          Delete
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}

function PasskeyRow(props: {
  passkey: Passkey;
  onEdit: (passkey: Passkey) => void;
  onDelete: (passkey: Passkey) => void;
}) {
  const { passkey, onEdit, onDelete } = props;
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-low truncate">{passkey.name}</div>
        {/* `Time` neutralizes itself for visual tests, so the surrounding
            labels stay visible in the baselines. */}
        <div className="text-low truncate text-xs">
          {passkey.lastUsedAt ? (
            <>
              Last used{" "}
              <Time date={passkey.lastUsedAt} format="date" tooltip="none" />
              {" • "}
            </>
          ) : (
            "Never used • "
          )}
          Created <Time date={passkey.createdAt} format="date" tooltip="none" />
          {passkey.synced ? " • Synced" : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          iconOnly
          aria-label={`Rename ${passkey.name}`}
          onPress={() => onEdit(passkey)}
        >
          <PencilIcon />
        </Button>
        <Button
          variant="danger"
          iconOnly
          aria-label={`Delete ${passkey.name}`}
          onPress={() => onDelete(passkey)}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}

export function PasskeyAuth(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { passkeys } = props.account;
  const isSupported = checkPasskeysSupported();
  const [isExpanded, setIsExpanded] = useState(false);
  const editing = useDialogValueState<Passkey | null>(null);
  const deleting = useDialogValueState<Passkey | null>(null);

  // Only *adding* needs WebAuthn. Listing and revoking are plain GraphQL, and
  // hiding them would strand a credential the user may urgently want gone —
  // they registered it elsewhere, and this browser is the one they have.
  // Dropping the card entirely would also misreport the account's auth surface,
  // showing every other method and silently omitting passkeys.
  if (!isSupported && passkeys.length === 0) {
    return null;
  }

  const showList = isExpanded && passkeys.length > 0;

  return (
    <>
      <ProviderCard
        label="Passkeys"
        body={
          showList ? (
            <div className="divide-y border-t">
              {passkeys.map((passkey) => (
                <PasskeyRow
                  key={passkey.id}
                  passkey={passkey}
                  onEdit={(value) => editing.open(value)}
                  onDelete={(value) => deleting.open(value)}
                />
              ))}
            </div>
          ) : null
        }
      >
        <ProviderIcon>
          <PasskeyIcon />
        </ProviderIcon>
        <ProviderContent>
          <div className="font-medium">Passkeys</div>
          {passkeys.length > 0 ? (
            <RACButton
              className="text-low data-focus-visible:text-default data-hovered:text-default flex items-center gap-1 focus:outline-hidden"
              onPress={() => setIsExpanded((expanded) => !expanded)}
            >
              {passkeys.length} passkey{passkeys.length > 1 ? "s" : ""}{" "}
              registered
              {isExpanded ? (
                <ChevronUpIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
            </RACButton>
          ) : (
            <div className="text-low">No passkeys registered</div>
          )}
        </ProviderContent>
        {isSupported ? (
          <DialogTrigger>
            <Button variant="secondary" className="shrink-0">
              <ButtonIcon>
                <PlusIcon />
              </ButtonIcon>
              Add
            </Button>
            <Modal>
              <CreatePasskeyDialog />
            </Modal>
          </DialogTrigger>
        ) : (
          <div className="text-low shrink-0 text-xs">
            This browser can’t add passkeys
          </div>
        )}
      </ProviderCard>

      {editing.value ? (
        <Modal isOpen={editing.isOpen} onOpenChange={editing.onOpenChange}>
          <EditPasskeyDialog passkey={editing.value} />
        </Modal>
      ) : null}

      {deleting.value ? (
        <Modal isOpen={deleting.isOpen} onOpenChange={deleting.onOpenChange}>
          <DeletePasskeyDialog passkey={deleting.value} />
        </Modal>
      ) : null}
    </>
  );
}
