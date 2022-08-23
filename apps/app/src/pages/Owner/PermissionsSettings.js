import React from "react";
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
import { GoLinkExternal } from "react-icons/go";
import { useOwner } from "../../containers/OwnerContext";
import { getPossessiveForm } from "../../modules/utils";

export function PermissionsSettings() {
  const { owner } = useOwner();
  return (
    <>
      <SidebarLayout.PageTitle>
        <PrimaryTitle>
          {getPossessiveForm(owner.name)} repositories permissions
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
                icon={GoLinkExternal}
              >
                this link
              </IllustratedText>{" "}
              to manage the repositories’ access restrictions.
            </CardText>
          </CardBody>
        </Card>
      </SidebarLayout.PageContent>
    </>
  );
}
