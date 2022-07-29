import { x } from "@xstyled/styled-components";

export const Paragraph = (props) => (
  <x.div
    color="secondary"
    lineHeight="normal"
    my={2}
    fontSize="18px"
    maxW="3xl"
    {...props}
  />
);
