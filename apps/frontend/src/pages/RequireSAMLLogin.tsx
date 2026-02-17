import { invariant } from "@argos/util/invariant";
import { LockIcon } from "@primer/octicons-react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { BrandShield } from "@/ui/BrandShield";
import { ButtonIcon, LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { getSAMLLoginUrl } from "@/util/saml";

export function RequireSAMLLogin() {
  const params = useParams();
  invariant(
    params.accountSlug,
    "Account slug should be set if we are on this page",
  );

  return (
    <>
      <Helmet>
        <title>Login</title>
      </Helmet>

      <Container className="flex max-w-2xl flex-col items-center px-4 py-20">
        <BrandShield className="mb-6 w-20" />

        <h1 className="mb-8 text-3xl font-semibold">Single Sign-On Required</h1>

        <p className="mb-8 text-center">
          The team <strong>{params.accountSlug}</strong> is protected by your
          organization’s Single Sign-On (SAML).
          <br />
          Please sign in using your company account to continue.
        </p>

        <LinkButton
          size="large"
          href={getSAMLLoginUrl({
            teamSlug: params.accountSlug,
            redirect: window.location.pathname,
          })}
        >
          <ButtonIcon>
            <LockIcon />
          </ButtonIcon>
          Sign in with SSO
        </LinkButton>
      </Container>
    </>
  );
}
