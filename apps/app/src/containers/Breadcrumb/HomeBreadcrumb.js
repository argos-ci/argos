import * as React from "react";
import { useMatch } from "react-router-dom";
import { HomeIcon } from "@primer/octicons-react";
import { BreadcrumbItem, BreadcrumbLink } from "@argos-ci/app/src/components";

export function HomeBreadcrumbItem() {
  const match = useMatch("/");

  return (
    <BreadcrumbItem ml={-2}>
      <BreadcrumbLink to="/" aria-current={match ? "page" : undefined}>
        <HomeIcon size={18} />
        {match ? "Home" : null}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
