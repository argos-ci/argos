import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { NotFound } from "@/pages/NotFound";
import { graphql, DocumentType } from "@/gql";
import { Heading } from "@/modern/ui/Typography";
import { PageLoader } from "@/modern/ui/PageLoader";
import { Card, CardFooter, CardBody, CardTitle } from "@/modern/ui/Card";
import { Container } from "@/modern/ui/Container";
import { Anchor } from "@/modern/ui/Link";
import { LinkExternalIcon, ArrowRightIcon } from "@primer/octicons-react";
import config from "@/config";

const OwnerQuery = graphql(`
  query OwnerSettings_owner($login: String!) {
    owner(login: $login) {
      id
      name
      screenshotsLimitPerMonth

      plan {
        id
        name
        screenshotsLimitPerMonth
      }

      repositories {
        id
        name
        private
        currentMonthUsedScreenshots
      }
    }
  }
`);

type OwnerDocument = DocumentType<typeof OwnerQuery>;

const PlanCard = ({
  plan,
}: {
  plan: NonNullable<NonNullable<OwnerDocument["owner"]>["plan"]>;
}) => {
  const free = plan.name === "free";
  return (
    <Card>
      <CardBody>
        <CardTitle>Plan</CardTitle>
        <p>
          Your organization account is on the{" "}
          <strong className="capitalize">{plan.name} plan</strong>.
          {free && " Free of charge."}{" "}
          <Anchor href="https://github.com/marketplace/argos-ci" external>
            Learn more
          </Anchor>
        </p>
      </CardBody>
      <CardFooter>
        <Anchor href="https://github.com/marketplace/argos-ci" external>
          Manage plan on GitHub
        </Anchor>
      </CardFooter>
    </Card>
  );
};

const PermissionCard = () => {
  return (
    <Card>
      <CardBody>
        <CardTitle>Permissions</CardTitle>
        <p>
          Argos uses OAuth GitHub App to manage your repositories. You can
          revoke access to your repositories at any time.
        </p>
      </CardBody>
      <CardFooter>
        <Anchor href={config.get("github.appUrl")} external>
          Manage repositories access restrictions from GitHub
        </Anchor>
      </CardFooter>
    </Card>
  );
};

export const OwnerSettings = () => {
  const { ownerLogin } = useParams();

  if (!ownerLogin) return null;

  return (
    <Container>
      <Helmet>
        <title>{ownerLogin} • Settings</title>
      </Helmet>
      <Heading>Organization Settings</Heading>

      <Query
        fallback={<PageLoader />}
        query={OwnerQuery}
        variables={{ login: ownerLogin }}
      >
        {({ owner }) => {
          if (!owner) return <NotFound />;

          return (
            <div className="flex max-w-4xl flex-col gap-6">
              {owner.plan && <PlanCard plan={owner.plan} />}
              <PermissionCard />
            </div>
          );
        }}
      </Query>
    </Container>
  );
};
