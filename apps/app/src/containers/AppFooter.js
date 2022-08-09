import React from "react";
import { useColorMode } from "@xstyled/styled-components";
import {
  Footer,
  FooterBody,
  FooterPrimary,
  FooterSecondary,
  FooterLink,
  BrandLogo,
} from "../components";

export function AppFooter() {
  const [colorMode] = useColorMode();
  return (
    <Footer>
      <FooterBody>
        <FooterPrimary>
          <BrandLogo colorMode={colorMode} width={120} />
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
