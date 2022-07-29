import { x } from "@xstyled/styled-components";

export const GradientText = ({
  children,
  backgroundImage = "gradient-to-r",
  gradientFrom = "purple-100",
  gradientTo = "purple-600",
  ...props
}) => (
  <x.span
    backgroundClip="text"
    color="transparent"
    backgroundImage={backgroundImage}
    gradientFrom={gradientFrom}
    gradientTo={gradientTo}
    {...props}
  >
    {children}
  </x.span>
);
