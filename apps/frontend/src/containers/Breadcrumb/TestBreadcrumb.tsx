import { FileImageIcon } from "lucide-react";

import {
  BreadcrumbItem,
  BreadcrumbItemIcon,
  BreadcrumbLabel,
  BreadcrumbLink,
} from "@/ui/Breadcrumb";

export function TestBreadcrumbItem(props: {
  accountSlug: string;
  projectName: string;
  testId: string;
}) {
  const { accountSlug, projectName, testId } = props;

  return (
    // A phone leaves the test out: the page's own title names it.
    <BreadcrumbItem className="max-md:hidden">
      <BreadcrumbLink
        href={`${accountSlug}/${projectName}/tests/${testId}`}
        aria-current="page"
      >
        <BreadcrumbItemIcon>
          <FileImageIcon size={18} />
        </BreadcrumbItemIcon>
        <BreadcrumbLabel>{testId}</BreadcrumbLabel>
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
