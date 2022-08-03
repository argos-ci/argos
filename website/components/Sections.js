import { x } from "@xstyled/styled-components";

export const Section = (props) => <x.div py={16} {...props} />;

export const SectionHeader = ({ children, ...props }) => (
  <x.div
    display="grid"
    gridTemplateColumns="auto minmax(0, 1fr)"
    columnGap={4}
    rowGap={1}
    my={4}
    {...props}
  >
    {children}
  </x.div>
);
export const SectionIcon = ({ children, icon: Icon, ...props }) => (
  <x.div
    gridArea={{ sm: "span 2" }}
    borderRadius="full"
    px={2}
    backgroundColor="accent-bg"
    w={16}
    h={16}
    fontSize={44}
    display="flex"
    justifyContent="center"
    alignItems="center"
    {...props}
  >
    {Icon ? <x.div as={Icon} w={1} h={1} /> : children}
  </x.div>
);

export const SectionColoredTitle = (props) => (
  <x.h2
    gridArea={{ _: "3 / span 2", sm: "2 / 2" }}
    fontSize="sm"
    fontWeight="500"
    textTransform="uppercase"
    letterSpacing="wide"
    color="on-accent"
    {...props}
  />
);

export const SectionTitle = (props) => (
  <x.div
    gridArea={{ _: "2 / span 2", sm: "initial" }}
    text="4xl"
    fontWeight="semibold"
    {...props}
  />
);
