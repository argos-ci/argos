import { WaypointsIcon } from "lucide-react";

import { useStoredNames } from "@/pages/Project/Flows/util";
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
  const { names } = useStoredNames({ accountSlug, projectName });
  const title = names[flowId] ?? flowId.split(" › ").at(-1) ?? flowId;

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
