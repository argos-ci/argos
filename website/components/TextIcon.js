import { x } from "@xstyled/styled-components";

export const TextIcon = ({
  icon: Icon,
  iconStyle = {},
  children,
  ...props
}) => (
  <x.div display="flex" whiteSpace="nowrap" my={1} {...props}>
    <x.div as={Icon} w={4} h={4} minW={4} mr={2} mt="1px" {...iconStyle} />
    {children}
  </x.div>
);
