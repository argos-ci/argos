import { memo, useState } from "react";
import { useMutation } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { FlagOffIcon } from "lucide-react";
import { DialogTrigger } from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton, type IconButtonProps } from "@/ui/IconButton";
import { Modal } from "@/ui/Modal";

import type { BuildDiffDetailDocument } from "../BuildDiffDetail";

const IgnoreChangeMutation = graphql(`
  mutation IgnoreButton_ignoreChange($accountSlug: String!, $changeId: ID!) {
    ignoreChange(input: { accountSlug: $accountSlug, changeId: $changeId }) {
      id
      ignored
    }
  }
`);

const UnignoreChangeMutation = graphql(`
  mutation IgnoreButton_unignoreChange($accountSlug: String!, $changeId: ID!) {
    unignoreChange(input: { accountSlug: $accountSlug, changeId: $changeId }) {
      id
      ignored
    }
  }
`);

function BaseIgnoreButton(props: Omit<IconButtonProps, "children">) {
  return (
    <IconButton {...props}>
      <FlagOffIcon />
    </IconButton>
  );
}

function EnabledIgnoreButton(props: { diff: BuildDiffDetailDocument }) {
  const { diff } = props;
  const params = useProjectParams();
  invariant(params, "IgnoreButton requires project params");
  invariant(diff.change, "IgnoreButton requires a change in the diff");
  const isIgnored = diff.change.ignored;
  const [dialog, setDialog] = useState<"ignore" | "unignore" | null>(null);
  const openDialog = () => {
    setDialog(isIgnored ? "unignore" : "ignore");
  };
  const hotkey = useBuildHotkey("ignoreChange", openDialog, {
    preventDefault: true,
  });
  const [ignoreChange] = useMutation(IgnoreChangeMutation, {
    variables: {
      accountSlug: params.accountSlug,
      changeId: diff.change.id,
    },
    optimisticResponse: {
      ignoreChange: {
        __typename: "TestChange",
        id: diff.change.id,
        ignored: true,
      },
    },
  });
  const [unignoreChange] = useMutation(UnignoreChangeMutation, {
    variables: {
      accountSlug: params.accountSlug,
      changeId: diff.change.id,
    },
    optimisticResponse: {
      unignoreChange: {
        __typename: "TestChange",
        id: diff.change.id,
        ignored: false,
      },
    },
  });
  return (
    <>
      <HotkeyTooltip
        description={isIgnored ? "Unignore change" : hotkey.description}
        keys={hotkey.displayKeys}
      >
        <BaseIgnoreButton
          aria-pressed={isIgnored}
          onPress={openDialog}
          color={isIgnored ? "danger" : undefined}
        />
      </HotkeyTooltip>
      <DialogTrigger
        isOpen={dialog === "ignore"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
          }
        }}
      >
        <Modal>
          <Dialog size="medium">
            <DialogBody>
              <DialogTitle>Ignore Change</DialogTitle>
              <DialogText>
                When you ignore this diff Argos will skip it in future builds.
                <br />
                Only ignore changes that are actually{" "}
                <strong>flaky and have recurred several times</strong>.<br />
                Argos will ignore{" "}
                <strong>
                  any future diff that exactly matches this overlay
                </strong>
                .
              </DialogText>
            </DialogBody>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <Button
                variant="destructive"
                onPress={() => {
                  ignoreChange();
                  setDialog(null);
                }}
              >
                Ignore Change
              </Button>
            </DialogFooter>
          </Dialog>
        </Modal>
      </DialogTrigger>
      <DialogTrigger
        isOpen={dialog === "unignore"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
          }
        }}
      >
        <Modal>
          <Dialog size="medium">
            <DialogBody>
              <DialogTitle>Unignore Change</DialogTitle>
              <DialogText>
                Re-enable this diff so Argos will treat it as a change in future
                builds.
                <br />
                <strong>
                  Only unignore if you’re sure the flake is resolved.
                </strong>
                <br />
                Argos will now track any exact match of this overlay again.
              </DialogText>
            </DialogBody>
            <DialogFooter>
              <DialogDismiss>Cancel</DialogDismiss>
              <Button
                variant="destructive"
                onPress={() => {
                  unignoreChange();
                  setDialog(null);
                }}
              >
                Unignore Change
              </Button>
            </DialogFooter>
          </Dialog>
        </Modal>
      </DialogTrigger>
    </>
  );
}

export const IgnoreButton = memo(function IgnoreButton(props: {
  diff: BuildDiffDetailDocument;
}) {
  const { diff } = props;

  if (diff.change) {
    return <EnabledIgnoreButton diff={diff} />;
  }

  return <BaseIgnoreButton isDisabled />;
});
