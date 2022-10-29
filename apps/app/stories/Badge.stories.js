import { x } from "@xstyled/styled-components";
import * as React from "react";

import { Badge } from "@argos-ci/app/src/components";

export const Badges = () => (
  <x.div display="flex" gap={3}>
    <Badge>23</Badge>
    <Badge variant="secondary">secondary</Badge>
  </x.div>
);

export default { title: "Badge" };
