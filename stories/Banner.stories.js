/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Banner, Icon, Link } from "@argos-ci/app/src/components";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";

const main = {
  title: "Banner",
};

export default main;

export const Primary = () => (
  <x.div display="flex" flexDirection="column" gap={3} maxW={1000}>
    <Banner>default banner (neutral)</Banner>
    <Banner color="info">info banner</Banner>
    <Banner color="success">success banner</Banner>
    <Banner color="danger">danger banner</Banner>
    <Banner color="neutral">neutral banner</Banner>
    <Banner color="warning">warning banner</Banner>

    <Banner color="warning" mt={10}>
      <Icon as={ExclamationTriangleIcon} w={4} />
      You've hit 95% of the plan limit. <Link>Upgrade plan</Link>
    </Banner>

    <Banner color="danger">
      <Icon as={ExclamationTriangleIcon} w={4} />
      You've hit 105% of the plan limit. <Link>Upgrade plan</Link>
    </Banner>
  </x.div>
);
