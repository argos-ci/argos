import { CheckCircleIcon } from "lucide-react";
import { Helmet } from "react-helmet";

import { BrandShield } from "@/ui/BrandShield";
import { Card, CardBody } from "@/ui/Card";
import { Container } from "@/ui/Container";

import { Code } from "../ui/Code";

export function Component() {
  return (
    <>
      <Helmet>
        <title>Authorization successful — Argos</title>
      </Helmet>
      <Container className="mt-12 max-w-sm px-4">
        <div className="flex flex-col items-center gap-6">
          <BrandShield className="mt-3 w-28" />

          <div className="text-center">
            <h1 className="text-2xl font-semibold">Authorization successful</h1>
            <p className="text-primary-low mt-1 text-base font-semibold">
              You can close this tab.
            </p>
          </div>

          <Card className="w-full">
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="text-success size-4 shrink-0" />
                <span className="text-sm font-medium">
                  Logged in to Argos CLI
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
        <p className="text-low mt-3 text-center text-xs">
          Token saved to <Code>~/.config/argos-ci/config.json</Code>
        </p>
      </Container>
    </>
  );
}
