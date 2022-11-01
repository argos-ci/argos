import { x } from "@xstyled/styled-components";

export const HotkeySeparator = () => <x.div color="secondary-text">·</x.div>;

export const Hotkey = ({ children, ...props }) => (
  <x.div
    fontSize="10px"
    lineHeight={1}
    px={1}
    py={0.5}
    color="hotkey-on"
    display="flex"
    justifyContent="center"
    alignItems="center"
    backgroundColor="hotkey-bg"
    borderRadius="base"
    minW={4}
    minH={4}
    {...props}
  >
    {children}
  </x.div>
);
