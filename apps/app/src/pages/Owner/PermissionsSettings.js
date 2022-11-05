/* eslint-disable react/no-unescaped-entities */
import { LinkExternalIcon } from "@primer/octicons-react";
import { gql } from "graphql-tag";

import {
  Card,
  CardBody,
  CardText,
  Link,
  PrimaryTitle,
  SidebarLayout,
} from "@/components";
import config from "@/config";
import { getPossessiveForm } from "@/modules/utils";

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
              <Link href={config.get("github.appUrl")} target="_blank">
                Manage repositories' access restrictions from GitHub{" "}
                <LinkExternalIcon />
              </Link>
            </CardText>
          </CardBody>
        </Card>
      </SidebarLayout.PageContent>
    </>
  );
}
