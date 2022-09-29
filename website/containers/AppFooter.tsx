import { useEffect, useState } from "react";
import styled, { x, useColorMode } from "@xstyled/styled-components";
import { Container } from "@/components/Container";
import { ArgosLogo } from "@/components/ArgosLogo";
import {
  FooterSections,
  FooterSection,
  FooterSectionTitle,
  FooterLink,
} from "@/components/Footer";

const Select = styled.select`
  appearance: none;
  border: 1px solid;
  border-color: layout-border;
  border-radius: default;
  padding: 2 4;
  background-color: transparent;
  color: on-light;
`;

const STORAGE_KEY = "xstyled-color-mode";

const ColorModeSelector = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
  }, []);
  const [_colorMode, setColorMode] = useColorMode();
  const [mode, setMode] = useState(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(STORAGE_KEY) ?? null
  );
  if (!visible) return null;
  return (
    <Select
      value={mode ?? "system"}
      onChange={(event) => {
        const mode =
          event.target.value === "system" ? null : event.target.value;
        setMode(mode);
        setColorMode(mode);
      }}
    >
      <option value="system">System</option>
      <option value="dark">Dark</option>
      <option value="default">Light</option>
    </Select>
  );
};

export const AppFooter: React.FC = () => (
  <x.footer
    borderTop={1}
    borderTopColor="layout-border"
    my={10}
    pt={{ _: 10, sm: 20 }}
    pb={16}
    lineHeight="24px"
    fontSize="14px"
  >
    <Container>
      <FooterSections>
        <FooterSection>
          <FooterSectionTitle>Getting Started</FooterSectionTitle>
          <FooterLink href="https://docs.argos-ci.com/getting-started">
            Installation
          </FooterLink>
          <FooterLink href="https://docs.argos-ci.com/usage">Usage</FooterLink>
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
          <FooterLink href="https://twitter.com/argos_ci?s=20&t=lOyYmPfhjDeHIKiGdNMTMw">
            Twitter
          </FooterLink>
        </FooterSection>
      </FooterSections>

      <x.hr mt={16} mb={10} borderBottom={1} borderColor="layout-border" />
      <x.div display="flex" justifyContent="space-between">
        <ArgosLogo width="160" />
        <ColorModeSelector />
      </x.div>
    </Container>
  </x.footer>
);
