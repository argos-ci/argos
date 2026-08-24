import { memo, useState } from "react";
import { useApolloClient, useFragment } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { FlagOffIcon } from "lucide-react";

import { useAuth } from "@/containers/Auth";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { useProjectIgnoreEnabled } from "@/containers/Project/IgnoreContext";
import { graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Button, type ButtonProps } from "@/ui/Button";
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

/**
 * What the toolbar reads the flag from. The build page fetches its diffs with
 * `no-cache` (see `useDataState`), so the snapshot it hands down is not a
 * normalized entity and never hears about the mutation's cache write — the
 * change would be ignored on the server while the button stayed as it was
 * until a reload. Both mutations write the change to the cache, so the flag
 * follows that entity and falls back to the snapshot until it is there.
 */
const TestChangeFragment = graphql(`
  fragment IgnoreButton_TestChange on TestChange {
    id
    ignored
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

function BaseIgnoreButton(props: Omit<ButtonProps, "children">) {
  return (
    <Button variant="secondary" iconOnly {...props}>
      <FlagOffIcon />
    </Button>
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
  const [dialog, setDialog] = useState<"ignore" | "unignore" | null>(null);
  const auth = useAuth();
  const client = useApolloClient();
  const changeId = diff.change.id;
  const cachedChange = useFragment({
    fragment: TestChangeFragment,
    fragmentName: "IgnoreButton_TestChange",
    from: { __typename: "TestChange", id: changeId },
  });
  const isIgnored = cachedChange.complete
    ? cachedChange.data.ignored
    : diff.change.ignored;

  const ignoreChange = () => {
    const auditTrailId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-audit-trail-${Date.now()}`;
    client
      .mutate({
        mutation: IgnoreChangeMutation,
        variables: {
          accountSlug: params.accountSlug,
          changeId,
        },
        optimisticResponse: {
          ignoreChange: {
            __typename: "TestChange",
            id: changeId,
            ignored: true,
          },
        },
        update: (cache) => {
          if (diff.test) {
            const account =
              auth.status === "authenticated" ? auth.account : null;
            invariant(account, "User should be logged in");
            addAuditTrailEntry({
              cache,
              action: "files.ignored",
              account,
              testId: diff.test.id,
              accountSlug: params.accountSlug,
              projectName: params.projectName,
            });
          }
        },
        context: { auditTrailId },
      })
      .catch(() => {
        // Optimistic response will handle this
      });
    onIgnoreChange?.();
    setDialog(null);
  };

  const unignoreChange = () => {
    const auditTrailId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-audit-trail-${Date.now()}`;
    client.mutate({
      mutation: UnignoreChangeMutation,
      variables: {
        accountSlug: params.accountSlug,
        changeId,
      },
      optimisticResponse: {
        unignoreChange: {
          __typename: "TestChange",
          id: changeId,
          ignored: false,
        },
      },
      update: (cache) => {
        if (diff.test) {
          const account = auth.status === "authenticated" ? auth.account : null;
          invariant(account, "User should be logged in");
          addAuditTrailEntry({
            cache,
            action: "files.unignored",
            account,
            testId: diff.test.id,
            accountSlug: params.accountSlug,
            projectName: params.projectName,
          });
        }
      },
      context: { auditTrailId },
    });
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
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDialog(null);
    }
  };

  return (
    <>
      <HotkeyTooltip
        description={isIgnored ? "Unignore change" : hotkey.description}
        keys={hotkey.displayKeys}
      >
        <BaseIgnoreButton
          aria-label={isIgnored ? "Unignore change" : "Ignore change"}
          aria-pressed={isIgnored}
          onClick={toggle}
          variant={isIgnored ? "danger" : "secondary"}
        />
      </HotkeyTooltip>
      <Modal open={dialog === "ignore"} onOpenChange={handleOpenChange}>
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
                onCheckedChange={(value) => {
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
            <Button variant="destructive" onClick={ignoreChange}>
              Ignore Change
            </Button>
          </DialogFooter>
        </Dialog>
      </Modal>
      <Modal open={dialog === "unignore"} onOpenChange={handleOpenChange}>
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
            <Button variant="destructive" onClick={unignoreChange}>
              Unignore Change
            </Button>
          </DialogFooter>
        </Dialog>
      </Modal>
    </>
  );
}

export const IgnoreButton = memo(function IgnoreButton(props: {
  diff: BuildDiffDetailDocument;
  onIgnoreChange?: () => void;
}) {
  const { diff, onIgnoreChange } = props;
  const ignoreEnabled = useProjectIgnoreEnabled();

  // Hide the button entirely when the ignore feature is disabled.
  if (!ignoreEnabled) {
    return null;
  }

  if (diff.change) {
    return <EnabledIgnoreButton diff={diff} onIgnoreChange={onIgnoreChange} />;
  }

  return <BaseIgnoreButton disabled />;
});
