import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { CheckIcon } from "lucide-react";

import { BOOK_A_CALL_HREF, CONTACT_HREF } from "@/constants";
import { graphql } from "@/gql";
import { LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";

// Its own query rather than a fragment of the settings one: pricing the
// periods takes a billing aggregate, which only the Billing tab should pay for.
const EnterpriseOfferQuery = graphql(`
  query TeamEnterpriseOffer_account($slug: String!) {
    account(slug: $slug) {
      id
      ... on Team {
        showEnterpriseOffer
      }
    }
  }
`);

/** The Enterprise card of the pricing page, word for word. */
const ENTERPRISE_FEATURES = [
  "SAML SSO & SCIM included",
  "Fine-grained access control",
  "Dedicated support",
  "99.99% uptime SLA",
];

export function TeamEnterpriseOffer(props: { accountSlug: string }) {
  // Nothing while it loads: almost no team gets the card, so a placeholder
  // would reserve room for something that is not coming.
  return (
    <Suspense fallback={null}>
      <EnterpriseOffer accountSlug={props.accountSlug} />
    </Suspense>
  );
}

function EnterpriseOffer(props: { accountSlug: string }) {
  const { data, error } = useSuspenseQuery(EnterpriseOfferQuery, {
    variables: { slug: props.accountSlug },
    // An offer that cannot be read is left out: the rest of the Billing page
    // must not go down with it.
    errorPolicy: "all",
  });
  if (
    error ||
    data?.account?.__typename !== "Team" ||
    !data.account.showEnterpriseOffer
  ) {
    return null;
  }
  return (
    <Card intent="primary">
      <CardBody>
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <CardTitle className="!mb-0">
            A better price for your volume
          </CardTitle>
          <Chip color="primary" scale="sm">
            Enterprise
          </Chip>
        </div>
        <CardParagraph>
          Your team runs a lot of screenshots on Argos. At this volume, we can
          offer you a better price than the Pro plan. Let’s talk about what fits
          your usage.
        </CardParagraph>
        <CardParagraph>
          <div className="text-low mb-2 text-sm">Everything in Pro, plus:</div>
          <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {ENTERPRISE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckIcon
                  className="text-primary-low mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                {feature}
              </li>
            ))}
          </ul>
        </CardParagraph>
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div>
          Prefer email?{" "}
          <Link href={CONTACT_HREF} target="_blank">
            Contact Sales
          </Link>
        </div>
        <LinkButton href={BOOK_A_CALL_HREF} target="_blank">
          Book a call
        </LinkButton>
      </CardFooter>
    </Card>
  );
}
