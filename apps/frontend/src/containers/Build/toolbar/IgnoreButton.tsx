import { memo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { FlagOffIcon } from "lucide-react";
import { DialogTrigger } from "react-aria-components";

import { useAuthTokenPayload } from "@/containers/Auth";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
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
import * as sessionStorage from "@/util/session-storage";

import type { BuildDiffDetailDocument } from "../BuildDiffDetail";
import { addAuditTrailEntry } from "../TestTrail";

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

const dontShowAgainKey = "ignoreChangeDontShowAgain";

function EnabledIgnoreButton(props: {
  diff: BuildDiffDetailDocument;
  onIgnoreChange?: () => void;
}) {
  const { diff, onIgnoreChange } = props;
  const params = useProjectParams();
  invariant(params, "IgnoreButton requires project params");
  invariant(diff.change, "IgnoreButton requires a change in the diff");
  const isIgnored = diff.change.ignored;
  const [dialog, setDialog] = useState<"ignore" | "unignore" | null>(null);
  const authPayload = useAuthTokenPayload();
  invariant(authPayload);
  const [mutateIgnoreChange] = useMutation(IgnoreChangeMutation, {
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
    update: (cache) => {
      if (diff.test) {
        addAuditTrailEntry({
          cache,
          action: "files.ignored",
          authPayload,
          testId: diff.test.id,
        });
      }
    },
  });

  const ignoreChange = () => {
    const auditTrailId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-audit-trail-${Date.now()}`;
    mutateIgnoreChange({ context: { auditTrailId } }).catch(() => {
      // Optimistic response will handle this
    });
    onIgnoreChange?.();
    setDialog(null);
  };

  const [mutateUnignoreChange] = useMutation(UnignoreChangeMutation, {
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
    update: (cache) => {
      if (diff.test) {
        addAuditTrailEntry({
          cache,
          action: "files.unignored",
          authPayload,
          testId: diff.test.id,
        });
      }
    },
  });
  const unignoreChange = () => {
    const auditTrailId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-audit-trail-${Date.now()}`;
    mutateUnignoreChange({ context: { auditTrailId } });
    setDialog(null);
  };
  const toggle = () => {
    if (!isIgnored && sessionStorage.getItem(dontShowAgainKey) === "true") {
      ignoreChange();
    } else {
      setDialog(isIgnored ? "unignore" : "ignore");
    }
  };
  const hotkey = useBuildHotkey("ignoreChange", toggle, {
    preventDefault: true,
  });

  return (
    <>
      <HotkeyTooltip
        description={isIgnored ? "Unignore change" : hotkey.description}
        keys={hotkey.displayKeys}
      >
        <BaseIgnoreButton
          aria-pressed={isIgnored}
          onPress={toggle}
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
                If you ignore this diff, Argos will skip it in future builds.
                <br />
                Only ignore it if it’s{" "}
                <strong>flaky and you’ve seen it happen multiple times</strong>.
                <br />
                Argos will ignore{" "}
                <strong>future diffs that exactly match this one</strong>.
              </DialogText>
            </DialogBody>
            <DialogFooter>
              <div className="flex flex-1">
                <Checkbox
                  onChange={(value) => {
                    if (value) {
                      sessionStorage.setItem(dontShowAgainKey, "true");
                    } else {
                      sessionStorage.removeItem(dontShowAgainKey);
                    }
                  }}
                >
                  Don’t show this again for this session
                </Checkbox>
              </div>
              <DialogDismiss>Cancel</DialogDismiss>
              <Button variant="destructive" onPress={ignoreChange}>
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
              <Button variant="destructive" onPress={unignoreChange}>
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
  onIgnoreChange?: () => void;
}) {
  const { diff, onIgnoreChange } = props;

  if (diff.change) {
    return <EnabledIgnoreButton diff={diff} onIgnoreChange={onIgnoreChange} />;
  }

  return <BaseIgnoreButton isDisabled />;
});
