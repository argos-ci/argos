import React from "react";
import config from "../../config";
import {
  Card,
  CardBody,
  CardText,
  PrimaryTitle,
  IconLink,
  SidebarLayout,
} from "@argos-ci/app/src/components";
import { FaExternalLinkAlt } from "react-icons/fa";

export function PermissionsSettings() {
  return (
    <>
      <SidebarLayout.PageTitle>
        <PrimaryTitle>Repositories Permissions</PrimaryTitle>
      </SidebarLayout.PageTitle>

      <SidebarLayout.PageContent>
        <Card>
          <CardBody>
            <CardText fontSize="md" mb={3}>
              Argos uses OAuth GitHub App.
            </CardText>
            <CardText fontSize="md">
              Click on{" "}
              <IconLink
                href={config.get("github.appUrl")}
                target="_blank"
                rel="noopener noreferrer"
                fontWeight="normal"
                icon={FaExternalLinkAlt}
              >
                this link
              </IconLink>
              to manage the repositories’ access restrictions.
            </CardText>
          </CardBody>
        </Card>
      </SidebarLayout.PageContent>
    </>
  );
}
