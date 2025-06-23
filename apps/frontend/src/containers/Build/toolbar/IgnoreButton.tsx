import { memo, useState } from "react";
import { useMutation } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { FlagOffIcon } from "lucide-react";
import { DialogTrigger } from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { graphql } from "@/gql";
import { useAccountParams } from "@/pages/Account/AccountParams";
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
import { IconButton } from "@/ui/IconButton";
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

export const IgnoreButton = memo(function IgnoreButton(props: {
  diff: BuildDiffDetailDocument;
}) {
  const { diff } = props;
  invariant(diff.change, "IgnoreButton requires a change diff");
  const params = useAccountParams();
  invariant(params, "IgnoreButton requires account params");
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
        <IconButton
          aria-pressed={isIgnored}
          onPress={openDialog}
          color={isIgnored ? "danger" : undefined}
        >
          <FlagOffIcon />
        </IconButton>
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
                Ignoring this change will prevent it from being considered as a
                "change" in future builds. All changes that{" "}
                <strong>match exactly this diff overlay</strong> will be
                ignored.
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
                Ignore
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
                This change is currently ignored. Unignoring it will allow it to
                be considered as a "change" in future builds. All changes that{" "}
                <strong>match exactly this diff overlay</strong> will be
                unignored.
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
                Unignore
              </Button>
            </DialogFooter>
          </Dialog>
        </Modal>
      </DialogTrigger>
    </>
  );
});
