import { x } from "@xstyled/styled-components";

export const Title = (props) => (
  <x.h1 text="5xl" lineHeight="1.2" fontWeight="700" {...props} />
);

export const Subtitle = (props) => <x.p text="xl" {...props} />;
