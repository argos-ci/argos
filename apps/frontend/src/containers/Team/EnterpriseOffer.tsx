import { CheckIcon } from "lucide-react";

import { BOOK_A_CALL_HREF, CONTACT_HREF } from "@/constants";
import { DocumentType, graphql } from "@/gql";
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

const _TeamFragment = graphql(`
  fragment TeamEnterpriseOffer_Team on Team {
    id
    showEnterpriseOffer
  }
`);

/** The Enterprise card of the pricing page, word for word. */
const ENTERPRISE_FEATURES = [
  "SAML SSO & SCIM included",
  "Fine-grained access control",
  "Dedicated support",
  "99.99% uptime SLA",
];

export function TeamEnterpriseOffer(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  if (!props.team.showEnterpriseOffer) {
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
