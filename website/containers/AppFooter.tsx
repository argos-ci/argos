// import { useEffect, useState } from "react";
// import { x, useColorMode } from "@xstyled/styled-components";
import { x } from "@xstyled/styled-components";
import { Container } from "@/components/Container";
import { ArgosLogo } from "@/components/ArgosLogo";
// import { Select, SelectIcon } from "@/components/Select";
// import {
//   MoonIcon,
//   SunIcon,
//   ComputerDesktopIcon,
//   ChevronDownIcon,
// } from "@heroicons/react/24/solid";
import {
  FooterSections,
  FooterSection,
  FooterSectionTitle,
  FooterLink,
} from "@/components/Footer";

// const STORAGE_KEY = "xstyled-color-mode";

// const colorModeIcons = {
//   system: ComputerDesktopIcon,
//   dark: MoonIcon,
//   default: SunIcon,
// };

// const ColorModeSelector = () => {
//   const [visible, setVisible] = useState(false);
//   useEffect(() => {
//     setVisible(true);
//   }, []);
//   const [_colorMode, setColorMode] = useColorMode();
//   const [mode, setMode] = useState<"dark" | "default" | null>(() =>
//     typeof window === "undefined"
//       ? null
//       : (window.localStorage.getItem(STORAGE_KEY) as "dark" | "default") ?? null
//   );
//   const realMode: "system" | "dark" | "default" = mode ?? "system";
//   if (!visible) return null;
//   const Icon = colorModeIcons[realMode];
//   return (
//     <Select>
//       <SelectIcon>
//         <Icon />
//       </SelectIcon>
//       <select
//         value={realMode}
//         onChange={(event) => {
//           const mode =
//             event.target.value === "system"
//               ? null
//               : (event.target.value as "dark" | "default");
//           setMode(mode);
//           setColorMode(mode);
//         }}
//       >
//         <option value="system">System</option>
//         <option value="dark">Dark</option>
//         <option value="default">Light</option>
//       </select>
//       <SelectIcon>
//         <ChevronDownIcon />
//       </SelectIcon>
//     </Select>
//   );
// };

export const AppFooter: React.FC = () => (
  <x.footer
    borderTop={1}
    borderTopColor="layout-border"
    mb={10}
    pt={{ _: 10, sm: 20 }}
    pb={16}
    lineHeight="24px"
    fontSize="14px"
  >
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

      <x.hr mt={16} mb={10} borderBottom={1} borderColor="layout-border" />
      <x.div display="flex" justifyContent="space-between">
        <ArgosLogo width="160" />
        {/* <ColorModeSelector /> */}
      </x.div>
    </Container>
  </x.footer>
);
