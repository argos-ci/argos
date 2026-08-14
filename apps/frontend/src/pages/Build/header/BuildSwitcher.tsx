import { CheckIcon } from "lucide-react";
import { MenuTrigger } from "react-aria-components";

import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import {
  Menu,
  MenuItem,
  MenuItemIcon,
  MenuTitle,
  UpDownMenuButton,
} from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";

import { getBuildOverviewURL } from "../BuildParams";

const _BuildFragment = graphql(`
  fragment BuildSwitcher_Build on Build {
    id
    number
    name
    ...BuildStatusChip_Build
    siblingBuilds {
      id
      number
      name
      ...BuildStatusChip_Build
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

/**
 * Hops between the builds a single commit produced. A commit that runs several
 * suites leaves one build per suite, and the header only names the one being
 * looked at — so without this the others are reachable only through the build
 * list. Renders nothing when the commit produced this build alone.
 */
export function BuildSwitcher(props: {
  accountSlug: string;
  projectName: string;
  build: Build;
}) {
  const { accountSlug, projectName, build } = props;
  if (build.siblingBuilds.length === 0) {
    return null;
  }
  const builds = [build, ...build.siblingBuilds].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return (
    <MenuTrigger>
      <Tooltip content="Switch build">
        <UpDownMenuButton aria-label="Switch build" className="shrink-0" />
      </Tooltip>
      <Popover placement="bottom start">
        <Menu>
          <MenuTitle>Builds on this commit</MenuTitle>
          {builds.map((item) => (
            <MenuItem
              key={item.id}
              href={getBuildOverviewURL({
                accountSlug,
                projectName,
                buildNumber: item.number,
              })}
            >
              <MenuItemIcon>
                <CheckIcon
                  className={item.id === build.id ? undefined : "opacity-0"}
                />
              </MenuItemIcon>
              {/*
               * Named by its build name, not its number: on one commit the
               * name is what tells the builds apart, and it is the same word
               * the reviewer configured in CI. The number follows it, muted,
               * to tie the row back to the header.
               */}
              <span className="flex min-w-0 items-center gap-3">
                <span className="truncate">
                  {item.name}{" "}
                  <span className="text-low tabular-nums">#{item.number}</span>
                </span>
                <BuildStatusChip build={item} scale="sm" />
              </span>
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
