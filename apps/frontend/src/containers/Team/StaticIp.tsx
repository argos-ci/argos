import { STATIC_IP_PRICING } from "@/constants";
import { DocumentType, graphql } from "@/gql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { CopyButton } from "@/ui/CopyButton";
import { Link } from "@/ui/Link";

import { DisableStaticIpButton, EnableStaticIpButton } from "./StaticIpAddOn";

const _TeamFragment = graphql(`
  fragment TeamStaticIp_Team on Team {
    id
    staticIpEnabled
    staticIpAddresses
    plan {
      id
      staticIpIncluded
    }
    ...StaticIpAddOn_Team
  }
`);

export function TeamStaticIp(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const included = Boolean(team.plan?.staticIpIncluded);
  return (
    <Card>
      <CardBody>
        <CardTitle id="static-ip">Static IP</CardTitle>
        <CardParagraph>
          Reach GitHub from static IP addresses, so that a GitHub organization
          with an IP allow list can let Argos through.
        </CardParagraph>
        {team.staticIpEnabled && team.staticIpAddresses.length > 0 && (
          <>
            <ul className="border-thin divide-y-thin rounded-lg text-sm">
              {team.staticIpAddresses.map((address) => (
                <li
                  key={address}
                  className="flex items-center justify-between gap-4 px-4 py-2"
                >
                  <code>{address}</code>
                  <CopyButton text={address} />
                </li>
              ))}
            </ul>
            <CardParagraph>
              Add them to the{" "}
              <Link
                href="https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/managing-allowed-ip-addresses-for-your-organization"
                target="_blank"
              >
                IP allow list
              </Link>{" "}
              of each GitHub organization your projects use.
            </CardParagraph>
          </>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div>
          {included ? (
            "Static IP is included in your plan."
          ) : (
            <>
              Static IP is available as an add-on for{" "}
              <strong>${STATIC_IP_PRICING} per month</strong>.
            </>
          )}
        </div>
        {team.staticIpEnabled ? (
          <DisableStaticIpButton team={team} />
        ) : (
          <EnableStaticIpButton team={team} />
        )}
      </CardFooter>
    </Card>
  );
}
