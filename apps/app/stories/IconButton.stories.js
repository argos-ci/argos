/* eslint-disable react/no-unescaped-entities */
import { EyeIcon } from "@heroicons/react/24/solid";
import { x } from "@xstyled/styled-components";
import * as React from "react";

import { IconButton } from "@argos-ci/app/src/components";

export const States = () => (
  <x.div
    display="grid"
    gridTemplateColumns={2}
    gap={2}
    w={200}
    alignItems="center"
  >
    Initial
    <div>
      <IconButton icon={EyeIcon} />
    </div>
    Active
    <div>
      <IconButton icon={EyeIcon} toggle="on" />
    </div>
    Disable
    <div>
      <IconButton icon={EyeIcon} toggle="on" disabled />
    </div>
  </x.div>
);

export const VariantDangerStates = () => (
  <x.div
    display="grid"
    gridTemplateColumns={2}
    gap={2}
    w={200}
    alignItems="center"
  >
    Initial
    <div>
      <IconButton color="danger" icon={EyeIcon} />
    </div>
    Active
    <div>
      <IconButton color="danger" icon={EyeIcon} toggle="on" />
    </div>
    Disable
    <div>
      <IconButton color="danger" icon={EyeIcon} toggle="on" disabled />
    </div>
  </x.div>
);

export default { title: "Icon Button" };
