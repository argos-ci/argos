import { x } from "@xstyled/styled-components";
import { Link } from "./Link";

export const FooterSections: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <x.div
    display="flex"
    justifyContent="space-between"
    flexWrap="wrap"
    rowGap={10}
    columnGap={2}
  >
    {children}
  </x.div>
);

export const FooterSection: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <x.div
    display="flex"
    flexDirection="column"
    gap={2}
    flexGrow={1}
    flexBasis="140px"
  >
    {children}
  </x.div>
);

export const FooterSectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <x.div mb={1} fontWeight="semibold" color="on">
    {children}
  </x.div>
);

export const FooterLink: React.FC<{
  children: React.ReactNode;
  href: string;
}> = ({ children, href }) => (
  <div>
    <Link color={{ _: "on-light", hover: "on" }} href={href}>
      {children}
    </Link>
  </div>
);
