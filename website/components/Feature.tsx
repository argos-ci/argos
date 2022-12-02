import { x } from "@xstyled/styled-components";

export const FeatureList: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <x.div display="flex" flexDirection={{ _: "column", md: "row" }} gap={8}>
    {children}
  </x.div>
);

export const Feature: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <x.div display="flex" flexDirection="column" gap={4} textAlign="center">
    {children}
  </x.div>
);

export const FeatureIcon: React.FC<{
  icon: React.ComponentType;
  color: "primary" | "orange" | "green" | "sky";
}> = ({ icon: Icon, color }) => (
  <x.div
    borderRadius="full"
    w={10}
    h={10}
    display="flex"
    alignItems="center"
    justifyContent="center"
    margin="auto"
    backgroundColor={`feature-${color}-bg`}
    color={`feature-${color}-icon`}
  >
    <x.svg as={Icon} w={6} />
  </x.div>
);

export const FeatureTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <x.div text="feature-title">{children}</x.div>;

export const FeatureText: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <x.div text="teaser">{children}</x.div>;
