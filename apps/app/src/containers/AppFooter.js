import React from "react";
import {
  Footer,
  FooterBody,
  FooterPrimary,
  FooterSecondary,
  FooterLink,
  BrandLogo,
} from "@argos-ci/app/src/components";

export function AppFooter() {
  return (
    <Footer>
      <FooterBody>
        <FooterPrimary>
          <BrandLogo width={120} />
        </FooterPrimary>
        <FooterSecondary>
          <FooterLink href="https://docs.argos-ci.com">Docs</FooterLink>
          <FooterLink href="https://www.argos-ci.com/terms">Terms</FooterLink>
          <FooterLink href="https://www.argos-ci.com/privacy">
            Privacy
          </FooterLink>
          <FooterLink href="https://www.argos-ci.com/security">
            Security
          </FooterLink>
        </FooterSecondary>
      </FooterBody>
    </Footer>
  );
}
