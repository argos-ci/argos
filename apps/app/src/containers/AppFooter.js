import {
  BrandLogo,
  Footer,
  FooterBody,
  FooterLink,
  FooterPrimary,
  FooterSecondary,
} from "@/components";

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
