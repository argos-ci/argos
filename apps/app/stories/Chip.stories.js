import { SparklesIcon } from "@heroicons/react/24/solid";
import { x } from "@xstyled/styled-components";
import * as React from "react";

import { Chip } from "@/components";

export const Chips = () => (
  <x.div display="flex" gap={10} flexDirection="column">
    <x.div display="flex" gap={3}>
      <x.div display="flex" flexDirection="column" gap={3}>
        <Chip>Chip</Chip>
        <Chip icon={SparklesIcon}>Chip with icon</Chip>
        <Chip clickable>Clickable chip</Chip>
      </x.div>

      <x.div display="flex" flexDirection="column" gap={3}>
        <Chip color="info">Chip</Chip>
        <Chip color="info" icon={SparklesIcon}>
          Chip with icon
        </Chip>
        <Chip color="info" clickable>
          Clickable chip
        </Chip>
      </x.div>

      <x.div display="flex" flexDirection="column" gap={3}>
        <Chip color="success">Chip</Chip>
        <Chip color="success" icon={SparklesIcon}>
          Chip with icon
        </Chip>
        <Chip color="success" clickable>
          Clickable chip
        </Chip>
      </x.div>
    </x.div>

    <x.div display="flex" gap={3}>
      <x.div display="flex" flexDirection="column" gap={3}>
        <Chip color="danger">Chip</Chip>
        <Chip color="danger" icon={SparklesIcon}>
          Chip with icon
        </Chip>
        <Chip color="danger" clickable>
          Clickable chip
        </Chip>
      </x.div>

      <x.div display="flex" flexDirection="column" gap={3}>
        <Chip color="neutral">Chip</Chip>
        <Chip color="neutral" icon={SparklesIcon}>
          Chip with icon
        </Chip>
        <Chip color="neutral" clickable>
          Clickable chip
        </Chip>
      </x.div>

      <x.div display="flex" flexDirection="column" gap={3}>
        <Chip color="pending">Chip</Chip>
        <Chip color="pending" icon={SparklesIcon}>
          Chip with icon
        </Chip>
        <Chip color="pending" clickable>
          Clickable chip
        </Chip>
      </x.div>

      <x.div display="flex" flexDirection="column" gap={3}>
        <Chip color="warning">Chip</Chip>
        <Chip color="warning" icon={SparklesIcon}>
          Chip with icon
        </Chip>
        <Chip color="warning" clickable>
          Clickable chip
        </Chip>
      </x.div>
    </x.div>
  </x.div>
);

export default { title: "Chip" };
