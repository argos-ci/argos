import { invariant } from "@argos/util/invariant";
import { MailIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { getAccountURL, useAccountParams } from "@/pages/Account/AccountParams";
import { LinkButton } from "@/ui/Button";

import { ProviderCard, ProviderContent, ProviderIcon } from "../ui";

const _AccountFragment = graphql(`
  fragment EmailAuth_Account on User {
    id
    emails {
      email
      verified
    }
  }
`);

export function EmailAuth(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  const params = useAccountParams();
  invariant(params);
  const emails = account.emails.filter((email) => email.verified);
  return (
    <ProviderCard>
      <ProviderIcon>
        <MailIcon />
      </ProviderIcon>
      <ProviderContent>
        <div className="font-medium">Email</div>
        <div className="text-low text-sm">
          {emails.length === 0
            ? "No verified emails"
            : emails.map((email) => email.email).join(", ")}
        </div>
      </ProviderContent>
      <LinkButton
        variant="secondary"
        href={`${getAccountURL(params)}/settings#emails`}
      >
        Manage
      </LinkButton>
    </ProviderCard>
  );
}
