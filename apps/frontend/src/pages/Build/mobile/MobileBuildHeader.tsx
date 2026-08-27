import { Link } from "react-router";

import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { NavUserControl } from "@/containers/NavUserControl";
import { DocumentType, graphql } from "@/gql";
import { BrandShield } from "@/ui/BrandShield";
import { Tooltip } from "@/ui/Tooltip";

import type { BuildParams } from "../BuildParams";

const _BuildFragment = graphql(`
  fragment MobileBuildHeader_Build on Build {
    ...BuildStatusChip_Build
  }
`);

/**
 * The build header at phone width: identity and status only. The desktop
 * header's other occupants (pull request, review progress, submit) live in
 * the page content or the diff view's own chrome, where they have room.
 */
export function MobileBuildHeader(props: {
  build: DocumentType<typeof _BuildFragment> | null;
  params: BuildParams;
}) {
  const { build, params } = props;
  return (
    <div className="border-b-thin flex shrink-0 items-center gap-2 p-2">
      <Tooltip content="See all builds">
        <Link
          to={`/${params.accountSlug}/${params.projectName}/builds`}
          aria-label="See all builds"
          className="shrink-0"
        >
          <BrandShield className="size-7" />
        </Link>
      </Tooltip>
      <div className="min-w-0">
        <div className="text-sm font-medium">Build {params.buildNumber}</div>
        <div className="text-low truncate text-xs">
          {params.accountSlug}/{params.projectName}
        </div>
      </div>
      {build ? <BuildStatusChip build={build} scale="sm" /> : null}
      <div className="min-w-0 flex-1" />
      <NavUserControl />
    </div>
  );
}
