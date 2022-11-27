import { HomeIcon } from "@primer/octicons-react";
import { useMatch } from "react-router-dom";

import { BreadcrumbItem, BreadcrumbLink } from "@/modern/ui/Breadcrumb";
import { memo } from "react";

export const HomeBreadcrumbItem = memo(() => {
  const match = useMatch("/");

  return (
    <BreadcrumbItem className="-ml-2">
      <BreadcrumbLink to="/" aria-current={match ? "page" : undefined}>
        <HomeIcon size={18} />
        {match ? "Home" : null}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
});
