import React from "react";
import { useMatch } from "react-router-dom";
import { GoHome } from "react-icons/go";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  Icon,
} from "@argos-ci/app/src/components";

export function HomeBreadcrumbItem() {
  const match = useMatch("/");

  return (
    <BreadcrumbItem>
      <BreadcrumbLink to={`/`}>
        <Icon as={GoHome} height={{ _: 20, md: 25 }} />
        {match ? "Home" : null}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
