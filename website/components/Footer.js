import { x } from "@xstyled/styled-components";
import { Link } from "./Link";
import { PageContainer } from "./PageContainer";
import { Divider } from "./Divider";
import { ArgosLogo } from "./ArgosLogo";

const Sections = (props) => (
  <x.div
    display="flex"
    justifyContent="space-between"
    flexWrap="wrap"
    rowGap={10}
    columnGap={2}
    {...props}
  />
);

const Section = ({ children, ...props }) => (
  <x.div
    display="flex"
    flexDirection="column"
    gap={2}
    flexGrow={1}
    flexBasis="140px"
    {...props}
  >
    {children}
  </x.div>
);

const SectionTitle = ({ children, ...props }) => (
  <x.div color="white" mb={1} fontWeight="semibold" {...props}>
    {children}
  </x.div>
);

const FooterLink = ({ children, ...props }) => (
  <Link color={{ _: "secondary", hover: "white" }} {...props}>
    {children}
  </Link>
);

export const AppFooter = (props) => (
  <x.footer
    backgroundColor="background-secondary"
    my={10}
    pt={20}
    pb={16}
    lineHeight="24px"
    fontSize="14px"
    {...props}
  >
    <PageContainer>
      <Sections>
        <Section>
          <SectionTitle>Getting Started</SectionTitle>
          <FooterLink href="https://docs.argos-ci.com/getting-started/">
            Installation
          </FooterLink>
          <FooterLink href="https://docs.argos-ci.com/about-argos-ci/">
            About Argos
          </FooterLink>
          <FooterLink href="https://docs.argos-ci.com/visual-testing-routine/">
            Visual testing
          </FooterLink>
          <FooterLink href="https://github.com/argos-ci/argos-cli">
            Argos CLI
          </FooterLink>
          <FooterLink href="https://github.com/apps/argos-ci">
            Argos App on GitHub
          </FooterLink>
        </Section>
        <Section>
          <SectionTitle>Community</SectionTitle>
          <FooterLink href="https://github.com/argos-ci/argos">
            GitHub
          </FooterLink>
          <FooterLink href="https://discord.com/channels/1001395848489484288/1001427173254627349">
            Discord
          </FooterLink>
          <FooterLink href="https://twitter.com/argos_ci?s=20&t=lOyYmPfhjDeHIKiGdNMTMw">
            Twitter
          </FooterLink>
        </Section>
        <Section>
          <SectionTitle>Legal</SectionTitle>
          <FooterLink href="/terms">Terms</FooterLink>
          <FooterLink href="/privacy">Privacy</FooterLink>
          <FooterLink href="/security">Security</FooterLink>
        </Section>
      </Sections>
      <Divider mt={16} mb={10} />
      <ArgosLogo w="190px" />
    </PageContainer>
  </x.footer>
);
