import { x } from "@xstyled/styled-components";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { Chip } from "@/components/Chip";

const main = {
  title: "Chip",
};

export default main;

export const Primary = () => (
  <x.div display="flex" flexDirection="column" gap={3}>
    <Chip>Chip</Chip>
    <Chip icon={SparklesIcon}>Chip with icon</Chip>
    <Chip clickable>Clickable chip</Chip>
  </x.div>
);
