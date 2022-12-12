import { Container } from "@/components/Container";
import { ArgosLogo } from "@/components/ArgosLogo";
import {
  FooterSections,
  FooterSection,
  FooterSectionTitle,
  FooterLink,
} from "@/components/Footer";

export const AppFooter: React.FC = () => (
  <footer className="border-t border-t-slate-800 mb-10 pt-10 sm:pt-20 pb-16 leading-6 text-sm">
    <Container>
      <FooterSections>
        <FooterSection>
          <FooterSectionTitle>Getting Started</FooterSectionTitle>
          <FooterLink href="https://argos-ci.com/docs/getting-started">
            Installation
          </FooterLink>
          <FooterLink href="https://argos-ci.com/docs/usage">Usage</FooterLink>
          <FooterLink href="https://github.com/marketplace/argos-ci">
            View on GitHub Marketplace
          </FooterLink>
        </FooterSection>

        <FooterSection>
          <FooterSectionTitle>Legal</FooterSectionTitle>
          <FooterLink href="/terms">Terms</FooterLink>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <FooterLink href="/security">Security</FooterLink>
        </FooterSection>

        <FooterSection>
          <FooterSectionTitle>Community</FooterSectionTitle>
          <FooterLink href="https://github.com/argos-ci/argos">
            GitHub
          </FooterLink>
          <FooterLink href="https://discord.gg/pK79sv85Vg">Discord</FooterLink>
          <FooterLink href="https://twitter.com/argos_ci">Twitter</FooterLink>
        </FooterSection>
      </FooterSections>

      <hr className="mt-16 mb-10 border-b border-slate-800" />
      <div className="flex justify-between">
        <ArgosLogo width="160" />
      </div>
    </Container>
  </footer>
);
