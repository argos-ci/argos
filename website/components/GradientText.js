import { x } from "@xstyled/styled-components";

export const GradientText = ({
  children,
  backgroundImage = "gradient-to-r",
  gradientFrom = "indigo-500",
  gradientTo = "purple-500",
  ...props
}) => (
  <x.span
    backgroundClip="text"
    color="transparent"
    backgroundImage={backgroundImage}
    gradientFrom={gradientFrom}
    gradientTo={gradientTo}
    textShadow={`
    0 0 64px #bc6deaea`}
    {...props}
  >
    {children}
  </x.span>
);
