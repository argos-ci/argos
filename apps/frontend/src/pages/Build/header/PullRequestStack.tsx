import { StackIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import { ChevronDownIcon, CircleDashedIcon, CircleIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";
import { getBuildDescriptor } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";

import { getBuildOverviewURL } from "../BuildParams";

const _BuildFragment = graphql(`
  fragment PullRequestStack_Build on Build {
    pullRequest {
      id
    }
    pullRequestStack {
      baseBranch
      items {
        pullRequest {
          id
          number
          title
        }
        build {
          id
          number
          type
          status
        }
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type StackItem = NonNullable<Build["pullRequestStack"]>["items"][number];

/**
 * A row's icon, on the line that runs down the stack. The line leaves a gap
 * around the icon and reaches through the row's vertical padding, so the
 * segments of two rows meet at their shared edge: the offsets mirror the
 * padding of `getMenuItemClassName`, and a two-line row would break the line.
 */
function StackNode(props: {
  children: React.ReactNode;
  above: boolean;
  below: boolean;
}) {
  const segment = "border-hover absolute left-1/2 -translate-x-1/2 border-l";
  return (
    <span className="relative flex h-lh items-center">
      {props.above ? (
        <span
          aria-hidden
          className={clsx(
            segment,
            "-top-1.5 bottom-[calc(50%+0.5em+2px)] pointer-coarse:-top-2.5",
          )}
        />
      ) : null}
      {props.children}
      {props.below ? (
        <span
          aria-hidden
          className={clsx(
            segment,
            "top-[calc(50%+0.5em+2px)] -bottom-1.5 pointer-coarse:-bottom-2.5",
          )}
        />
      ) : null}
    </span>
  );
}

function StackItemIcon(props: { build: StackItem["build"] }) {
  const { build } = props;
  if (!build) {
    return <CircleDashedIcon aria-label="No build" />;
  }
  const descriptor = getBuildDescriptor(build.type, build.status);
  const Icon = descriptor.icon;
  return (
    <Icon
      aria-label={descriptor.label}
      className={lowTextColorClassNames[descriptor.color]}
    />
  );
}

/**
 * The pull requests this one is stacked with, each opening its latest build,
 * down to the branch the stack merges into. Hangs off the pull request in the
 * build header, and renders nothing when the pull request is not stacked.
 */
export function PullRequestStack(props: {
  build: Build;
  accountSlug: string;
  projectName: string;
  defaultOpen?: boolean;
}) {
  const { build, accountSlug, projectName } = props;
  const stack = build.pullRequestStack;
  if (!stack) {
    return null;
  }
  const currentId = build.pullRequest?.id;
  return (
    <MenuRoot defaultOpen={props.defaultOpen}>
      <Tooltip content="Stacked pull requests">
        <MenuTrigger>
          <Button variant="secondary" size="small" className="shrink-0">
            <ButtonIcon>
              <StackIcon />
            </ButtonIcon>
            {stack.items.length} stacked
            <ButtonIcon position="right">
              <ChevronDownIcon />
            </ButtonIcon>
          </Button>
        </MenuTrigger>
      </Tooltip>
      <Menu
        aria-label="Stacked pull requests"
        side="bottom"
        align="end"
        checkedIndicator="highlight"
        className="max-w-md"
      >
        {stack.items.map((item, index) => (
          <MenuItem
            key={item.pullRequest.id}
            href={
              item.build
                ? getBuildOverviewURL({
                    accountSlug,
                    projectName,
                    buildNumber: item.build.number,
                  })
                : undefined
            }
            icon={
              <StackNode
                above={index > 0}
                below={
                  index < stack.items.length - 1 || Boolean(stack.baseBranch)
                }
              >
                <StackItemIcon build={item.build} />
              </StackNode>
            }
            checked={item.pullRequest.id === currentId}
            textValue={`#${item.pullRequest.number} ${item.pullRequest.title ?? ""}`}
            suffix={item.build ? undefined : "No build"}
          >
            <span className="text-low mr-2 tabular-nums">
              #{item.pullRequest.number}
            </span>
            {item.pullRequest.title}
          </MenuItem>
        ))}
        {stack.baseBranch ? (
          <MenuItem
            icon={
              <StackNode above below={false}>
                <CircleIcon />
              </StackNode>
            }
            textValue={stack.baseBranch}
          >
            <span className="font-mono">{stack.baseBranch}</span>
          </MenuItem>
        ) : null}
      </Menu>
    </MenuRoot>
  );
}
