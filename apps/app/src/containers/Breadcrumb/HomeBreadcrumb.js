import React from "react";
import { useMatch } from "react-router-dom";
import { HomeIcon } from "@primer/octicons-react";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  Icon,
} from "@argos-ci/app/src/components";

export function HomeBreadcrumbItem() {
  const match = useMatch("/");

  return (
    <BreadcrumbItem>
      <BreadcrumbLink to={`/`} py={1}>
        <Icon as={HomeIcon} size={24} w={{ _: 5, md: 6 }} h={{ _: 5, md: 6 }} />
        {match ? "Home" : null}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
