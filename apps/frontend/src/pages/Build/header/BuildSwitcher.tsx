import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType } from "@/gql/graphql";
import { UpDownMenuButton } from "@/ui/Menu";
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuRoot,
  MenuSection,
  MenuTrigger,
} from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";
import { getBuildDescriptor } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";

import { getBuildOverviewURL, getBuildParams } from "../BuildParams";

const _BuildFragment = graphql(`
  fragment BuildSwitcher_Build on Build {
    id
    number
    name
    type
    status
    project {
      id
      slug
      name
      account {
        id
        slug
      }
    }
    siblingBuilds {
      id
      number
      name
      type
      status
      project {
        id
        slug
        name
        account {
          id
          slug
        }
      }
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type SwitchableBuild = Build | Build["siblingBuilds"][number];

/**
 * Where a build's review stands, as the icon alone. The full status chip says
 * the same thing with a label and the reviewers' avatars, which is more than a
 * menu row can carry — the build name is what the reader scans for, and a
 * column of chips buries it. These are the same icons the build list and the
 * status filter use, and the label rides along as the icon's `aria-label`
 * rather than a tooltip: one per row would fire over the neighbouring rows as
 * the pointer runs down the column.
 */
function BuildStatusIcon(props: {
  type: BuildType | null;
  status: BuildStatus;
}) {
  const descriptor = getBuildDescriptor(props.type, props.status);
  const Icon = descriptor.icon;
  return (
    <Icon
      aria-label={descriptor.label}
      className={lowTextColorClassNames[descriptor.color]}
    />
  );
}

/**
 * This build's project first — the reviewer is already there — then the others
 * in alphabetical order, and within a project the builds by name.
 */
function compareBuilds(
  a: SwitchableBuild,
  b: SwitchableBuild,
  currentProjectId: string,
): number {
  if (a.project.id !== b.project.id) {
    if (a.project.id === currentProjectId) {
      return -1;
    }
    if (b.project.id === currentProjectId) {
      return 1;
    }
    return a.project.slug.localeCompare(b.project.slug);
  }
  return a.name.localeCompare(b.name);
}

/**
 * Hops between the builds a single commit produced. A commit that runs several
 * suites leaves one build per suite — and, in a monorepo split over several
 * Argos projects, one per project — while the header only names the one being
 * looked at. Without this the others are reachable only through the build
 * list. Renders nothing when the commit produced this build alone.
 */
export function BuildSwitcher(props: { build: Build }) {
  const { build } = props;
  if (build.siblingBuilds.length === 0) {
    return null;
  }
  const builds = [build, ...build.siblingBuilds].sort((a, b) =>
    compareBuilds(a, b, build.project.id),
  );
  // The build name is what tells the suites of one project apart, but two
  // projects of a monorepo both call theirs `default` — so the project has to
  // be named as soon as the commit reaches beyond this one. Named per row
  // rather than as a section heading: a row is what the reader lands on, and
  // it has to say where it goes on its own.
  const showProject = builds.some(
    (item) => item.project.id !== build.project.id,
  );
  return (
    <MenuRoot>
      <Tooltip content="Switch build">
        <MenuTrigger>
          <UpDownMenuButton aria-label="Switch build" className="shrink-0" />
        </MenuTrigger>
      </Tooltip>
      <Menu side="bottom" align="start">
        <MenuSection>
          <MenuHeading>Builds on this commit</MenuHeading>
          {builds.map((item) => (
            <MenuItem
              key={item.id}
              href={getBuildOverviewURL(getBuildParams(item))}
              icon={<BuildStatusIcon type={item.type} status={item.status} />}
              checked={item.id === build.id}
              textValue={item.name}
              subtitle={showProject ? item.project.slug : undefined}
            >
              {/*
               * Named by its build name, not its number: on one commit the
               * name is what tells the builds apart, and it is the same word
               * the reviewer configured in CI. The number follows it, muted,
               * to tie the row back to the header.
               */}
              {item.name}{" "}
              <span className="text-low tabular-nums">#{item.number}</span>
            </MenuItem>
          ))}
        </MenuSection>
      </Menu>
    </MenuRoot>
  );
}
