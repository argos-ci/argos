import { CheckCircleIcon, SparklesIcon } from "lucide-react";
import { Helmet } from "react-helmet";

import { BrandShield } from "@/ui/BrandShield";
import { Card, CardBody, CardSeparator } from "@/ui/Card";
import { Code } from "@/ui/Code";
import { Container } from "@/ui/Container";
import { CopyButton } from "@/ui/CopyButton";
import { Link } from "@/ui/Link";

const SKILL_INSTALL_COMMAND = "npx skills add https://argos-ci.com";

export function Component() {
  return (
    <>
      <Helmet>
        <title>Authorization successful — Argos</title>
      </Helmet>
      <Container className="mt-12 max-w-md px-4">
        <div className="flex flex-col items-center gap-6">
          <BrandShield className="mt-3 w-28" />

          <div className="text-center">
            <h1 className="text-2xl font-semibold">Authorization successful</h1>
            <p className="text-low mt-1 text-base">
              You can close this tab and return to your terminal.
            </p>
          </div>

          <Card className="w-full">
            <CardBody>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="text-success size-4 shrink-0" />
                <span className="text-sm font-medium">
                  Logged in to Argos CLI
                </span>
              </div>
              <p className="text-low mt-1.5 pl-6 text-xs">
                Token saved to <Code>~/.config/argos-ci/config.json</Code>
              </p>
            </CardBody>

            <CardSeparator />

            <CardBody className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="bg-primary-ui text-primary-low flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <SparklesIcon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Using an AI coding agent?
                  </p>
                  <p className="text-low mt-0.5 text-sm">
                    Add the Argos skill so it can set up and review visual tests
                    for you.
                  </p>
                </div>
              </div>

              <div className="bg-subtle flex items-center gap-3 rounded-lg border px-3.5 py-3">
                <span
                  aria-hidden="true"
                  className="text-primary-low shrink-0 font-mono text-sm select-none"
                >
                  $
                </span>
                <code className="text-default no-scrollbar min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
                  {SKILL_INSTALL_COMMAND}
                </code>
                <CopyButton
                  text={SKILL_INSTALL_COMMAND}
                  className="shrink-0 text-base"
                />
              </div>

              <Link
                href="https://argos-ci.com/docs"
                target="_blank"
                className="text-sm"
              >
                Learn more about Argos skills
              </Link>
            </CardBody>
          </Card>
        </div>
      </Container>
    </>
  );
}
