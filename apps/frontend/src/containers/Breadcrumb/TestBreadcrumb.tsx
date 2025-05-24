import { FileImageIcon } from "lucide-react";

import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLink,
} from "@/ui/Breadcrumb";

export function TestBreadcrumbItem(props: {
  accountSlug: string;
  projectName: string;
  testId: string;
}) {
  const { accountSlug, projectName, testId } = props;

  return (
    <BreadcrumbItem>
      <BreadcrumbLink
        href={`${accountSlug}/${projectName}/tests/${testId}`}
        aria-current="page"
      >
        <BreadcrumbItemIcon>
          <FileImageIcon size={18} />
        </BreadcrumbItemIcon>
        {testId}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
