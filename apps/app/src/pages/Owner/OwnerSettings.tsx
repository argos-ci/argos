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
          <Anchor
            href="https://github.com/marketplace/argos-ci"
            target="_blank"
          >
            Learn more <ArrowRightIcon className="h-[1em] w-[1em]" />
          </Anchor>
        </p>
      </CardBody>
      <CardFooter>
        <Anchor href="https://github.com/marketplace/argos-ci" target="_blank">
          Manage plan on GitHub <LinkExternalIcon className="h-[1em] w-[1em]" />
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
            <div className="flex max-w-4xl gap-4">
              {owner.plan && <PlanCard plan={owner.plan} />}
            </div>
          );
        }}
      </Query>
    </Container>
  );
};
