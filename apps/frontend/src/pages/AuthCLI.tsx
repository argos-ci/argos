import { Helmet } from "react-helmet";

import { BrandShield } from "@/ui/BrandShield";
import { Code } from "@/ui/Code";
import { Container } from "@/ui/Container";
import { Link } from "@/ui/Link";
import { Pre } from "@/ui/Pre";

const UPDATE_COMMAND = "npm install --save-dev @argos-ci/cli@latest";

/**
 * Only an `@argos-ci/cli` older than 6.4.0 opens this page: `argos login` has
 * gone through `/oauth/authorize` since. It used to mint a personal access
 * token for the CLI; it now only says to update.
 */
export function Component() {
  return (
    <>
      <Helmet>
        <title>Update the Argos CLI</title>
      </Helmet>
      <Container className="mt-12 max-w-lg px-4">
        <div className="flex flex-col items-center gap-6">
          <BrandShield className="mt-3 w-28" />

          <div className="text-center">
            <h1 className="text-2xl font-semibold">Update the Argos CLI</h1>
            <p className="text-low mt-1 text-base">
              This version of the Argos CLI can no longer log in. Update it to
              version 6.4.0 or later, then run{" "}
              <Code className="whitespace-nowrap">argos login</Code> again.
            </p>
          </div>

          <Pre code={UPDATE_COMMAND} className="w-full text-sm" />

          <Link
            href="https://argos-ci.com/docs/sdks-reference/argos-command-line-interface-cli"
            target="_blank"
            className="text-sm"
          >
            Install with another package manager
          </Link>
        </div>
      </Container>
    </>
  );
}
