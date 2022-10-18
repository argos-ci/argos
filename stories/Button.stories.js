import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Button } from "@argos-ci/app/src/components";

export const Buttons = () => (
  <x.div display="flex" gap={3}>
    <Button>Default</Button>
    <Button color="secondary">Secondary</Button>
    <Button color="secondary" disabled>
      Secondary disabled
    </Button>
  </x.div>
);

export const VariantOutline = () => (
  <x.div display="flex" gap={3}>
    <Button variant="outline">Outline</Button>
    <Button variant="outline" color="secondary">
      Secondary
    </Button>
    <Button variant="outline" color="secondary" disabled>
      Secondary disabled
    </Button>
  </x.div>
);

export default { title: "Button" };
