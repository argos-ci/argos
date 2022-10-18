/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { x } from "@xstyled/styled-components";
import { EyeIcon } from "@heroicons/react/24/solid";
import { IconButton } from "@argos-ci/app/src/components";

const main = {
  title: "Icon Button",
};

export default main;

export const Primary = () => (
  <x.div display="flex" flexDirection="column" gap={3} color="primary-text">
    <x.div fontWeight={500}>Primary</x.div>

    <x.div display="flex" gap={4} alignItems="center">
      Default: <IconButton icon={EyeIcon} />
      Active: <IconButton icon={EyeIcon} toggle="on" />
      Disable: <IconButton icon={EyeIcon} toggle="on" disabled />
    </x.div>

    <x.div fontWeight={500} mt={10}>
      Danger
    </x.div>
    <x.div display="flex" gap={4} alignItems="center">
      Default: <IconButton color="danger" icon={EyeIcon} />
      Active: <IconButton color="danger" icon={EyeIcon} toggle="on" />
      Disable: <IconButton color="danger" icon={EyeIcon} toggle="on" disabled />
    </x.div>
  </x.div>
);
