import { WaypointsIcon } from "lucide-react";

import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
} from "@/ui/Breadcrumb";

export function FlowBreadcrumbItem(props: {
  accountSlug: string;
  projectName: string;
  flowId: string;
}) {
  const { accountSlug, projectName, flowId } = props;
  const title = flowId.split(" › ").at(-1) ?? flowId;

  return (
    <BreadcrumbItem>
      <BreadcrumbLink
        href={`${accountSlug}/${projectName}/flows/${encodeURIComponent(flowId)}`}
        aria-current="page"
      >
        <BreadcrumbItemIcon>
          <WaypointsIcon size={18} />
        </BreadcrumbItemIcon>
        {title}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
