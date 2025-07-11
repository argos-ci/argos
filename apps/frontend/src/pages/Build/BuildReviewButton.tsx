import { invariant } from "@argos/util/invariant";
import { ChevronDownIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import {
  BuildReviewAction_BuildFragment,
  BuildStatus,
  ProjectPermission,
  ValidationStatus,
} from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";
import { buildStatusDescriptors } from "@/util/build";

import { useSetValidationStatusMutation } from "./BuildReviewAction";
import { useMarkAllDiffsAsAccepted } from "./BuildReviewState";

const _ProjectFragment = graphql(`
  fragment BuildReviewButton_Project on Project {
    name
    permissions
    public
    account {
      id
      slug
    }
    build(number: $buildNumber) {
      id
      status
      ...BuildReviewAction_Build
    }
  }
`);

function BaseReviewButton(props: {
  build: {
    id: string;
    status: BuildStatus;
  } & BuildReviewAction_BuildFragment;
  disabled?: boolean;
  autoFocus?: boolean;
  onCompleted?: () => void;
  children?: React.ReactNode;
}) {
  const markAllDiffsAsAccepted = useMarkAllDiffsAsAccepted();
  invariant(markAllDiffsAsAccepted, "markAllDiffsAsAccepted must be defined");
  const [setValidationStatus, { loading }] = useSetValidationStatusMutation(
    props.build,
    {
      onCompleted: (data) => {
        if (data.setValidationStatus.status === BuildStatus.Accepted) {
          markAllDiffsAsAccepted();
        }
        props.onCompleted?.();
      },
    },
  );

  const { icon: AcceptIcon } = buildStatusDescriptors[BuildStatus.Accepted];
  const { icon: RejectIcon } = buildStatusDescriptors[BuildStatus.Rejected];

  return (
    <MenuTrigger>
      <Button
        className="shrink-0"
        isDisabled={props.disabled || loading}
        autoFocus={props.autoFocus}
      >
        {props.children ?? "Review changes"}
        <ButtonIcon position="right">
          <ChevronDownIcon />
        </ButtonIcon>
      </Button>
      <Popover placement="bottom end">
        <Menu>
          <MenuItem
            onAction={() => {
              setValidationStatus({
                variables: {
                  buildId: props.build.id,
                  validationStatus: ValidationStatus.Accepted,
                },
              });
            }}
            isDisabled={props.build.status === BuildStatus.Accepted}
          >
            <MenuItemIcon>
              <AcceptIcon className="text-success-low" />
            </MenuItemIcon>
            Approve changes
          </MenuItem>
          <MenuItem
            onAction={() => {
              setValidationStatus({
                variables: {
                  buildId: props.build.id,
                  validationStatus: ValidationStatus.Rejected,
                },
              });
            }}
            isDisabled={props.build.status === BuildStatus.Rejected}
          >
            <MenuItemIcon>
              <RejectIcon className="text-danger-low" />
            </MenuItemIcon>
            Reject changes
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

export function DisabledBuildReviewButton(props: { tooltip: React.ReactNode }) {
  return (
    <Tooltip content={props.tooltip}>
      <div>
        <Button isDisabled>Review changes</Button>
      </div>
    </Tooltip>
  );
}

export function BuildReviewButton(props: {
  project: DocumentType<typeof _ProjectFragment>;
  autoFocus?: boolean;
  onCompleted?: () => void;
  children?: React.ReactNode;
}) {
  const { project } = props;
  if (
    !project.build ||
    !project.account ||
    ![
      BuildStatus.Accepted,
      BuildStatus.Rejected,
      BuildStatus.ChangesDetected,
    ].includes(project.build.status)
  ) {
    return null;
  }

  if (!project.permissions.includes(ProjectPermission.Review)) {
    return (
      <DisabledBuildReviewButton tooltip="You must be a reviewer to approve or reject changes." />
    );
  }

  return (
    <BaseReviewButton
      build={project.build}
      autoFocus={props.autoFocus}
      onCompleted={props.onCompleted}
    >
      {props.children}
    </BaseReviewButton>
  );
}
