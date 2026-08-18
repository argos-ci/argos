import { DocumentType, graphql } from "@/gql";
import { LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Link } from "@/ui/Link";

import { CursorOriginLogo } from "../Origin";

const _AccountFragment = graphql(`
  fragment AccountCursorOrigin_Account on Account {
    id
    originInstallUrl
    originInstallation {
      id
      targetSlug
      url
      hasContentsAccess
    }
  }
`);

export function AccountCursorOrigin(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  const installation = account.originInstallation;

  return (
    <Card>
      <CardBody>
        <CardTitle id="cursor-origin">Cursor Origin</CardTitle>
        <CardParagraph>
          Install the Argos app on your Cursor Origin codebase to get status
          checks and comments on your Origin pull requests.
        </CardParagraph>
        {installation && (
          <div>
            <div className="border-thin flex items-center gap-2 rounded-lg p-4">
              <CursorOriginLogo className="size-6 shrink-0" />
              <div className="flex-1 font-semibold">
                <Link variant="neutral" href={installation.url} target="_blank">
                  {installation.targetSlug}
                </Link>
              </div>
              {!installation.hasContentsAccess && (
                <div className="text-low text-sm">
                  No content access: Argos relies on the base commit sent by the
                  CLI.
                </div>
              )}
            </div>
          </div>
        )}
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <p>
          Learn more about the{" "}
          <Link
            href="https://argos-ci.com/docs/learn/integrations/cursor-origin-integration"
            target="_blank"
          >
            Cursor Origin integration
          </Link>
          .
        </p>
        {installation ? (
          <LinkButton
            variant="secondary"
            href="https://cursor.com/codebase/settings/apps"
            target="_blank"
          >
            Manage on Origin
          </LinkButton>
        ) : account.originInstallUrl ? (
          <LinkButton href={account.originInstallUrl}>
            Install Argos on Origin
          </LinkButton>
        ) : null}
      </CardFooter>
    </Card>
  );
}
