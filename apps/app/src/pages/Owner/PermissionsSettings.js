/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { gql } from "graphql-tag";
import config from "../../config";
import {
  Card,
  CardBody,
  CardText,
  PrimaryTitle,
  SidebarLayout,
  IllustratedText,
  Link,
} from "@argos-ci/app/src/components";
import { LinkExternalIcon } from "@primer/octicons-react";
import { getPossessiveForm } from "../../modules/utils";

export const OwnerPermissionsSettingsFragment = gql`
  fragment OwnerPermissionsSettingsFragment on Owner {
    name
  }
`;

export function PermissionsSettings({ owner: { name } }) {
  return (
    <>
      <SidebarLayout.PageTitle>
        <PrimaryTitle>
          {getPossessiveForm(name)} Repositories Permissions
        </PrimaryTitle>
      </SidebarLayout.PageTitle>

      <SidebarLayout.PageContent>
        <Card>
          <CardBody>
            <CardText fontSize="md" mb={3}>
              Argos uses OAuth GitHub App.
            </CardText>
            <CardText fontSize="md">
              Click on{" "}
              <IllustratedText
                as={Link}
                reverse
                href={config.get("github.appUrl")}
                target="_blank"
                fontWeight="normal"
                icon={LinkExternalIcon}
              >
                this link
              </IllustratedText>{" "}
              to manage the repositories' access restrictions.
            </CardText>
          </CardBody>
        </Card>
      </SidebarLayout.PageContent>
    </>
  );
}
