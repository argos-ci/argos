import { ReceiptTextIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { ButtonIcon, LinkButton } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";

const _AccountFragment = graphql(`
  fragment AccountInvoicesCard_Account on Account {
    id
    slug
    stripeCustomerId
  }
`);

/**
 * The way into the invoices page, from the settings tab that owns everything
 * else about billing.
 *
 * Rendered only for an account Stripe bills: without a customer there is no
 * invoice to read, and a GitHub Marketplace subscription is invoiced by GitHub.
 */
export function AccountInvoicesCard(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;

  if (!account.stripeCustomerId) {
    return null;
  }

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="mb-1">Invoices</CardTitle>
          <CardParagraph className="text-low my-0 text-sm">
            Read what you have been billed and what your next invoice is coming
            to.
          </CardParagraph>
        </div>
        <LinkButton
          variant="secondary"
          href={`/${account.slug}/~/invoices`}
          className="shrink-0"
        >
          <ButtonIcon>
            <ReceiptTextIcon />
          </ButtonIcon>
          View invoices
        </LinkButton>
      </CardBody>
    </Card>
  );
}
