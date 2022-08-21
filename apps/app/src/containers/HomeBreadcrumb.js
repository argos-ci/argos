import React from "react";
import { useMatch } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { GoHome } from "react-icons/go";
import { BreadcrumbItem, BreadcrumbLink } from "@argos-ci/app/src/components";

export function HomeBreadcrumbItem() {
  const match = useMatch("/");

  return (
    <BreadcrumbItem>
      <BreadcrumbLink to={`/`}>
        <x.svg as={GoHome} height={{ _: 20, md: 25 }} />
        {match ? "Home" : null}
      </BreadcrumbLink>
    </BreadcrumbItem>
  );
}
