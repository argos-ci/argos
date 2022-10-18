/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Banner, Icon, Link } from "@argos-ci/app/src/components";
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";

export const Banners = () => (
  <x.div display="flex" flexDirection="column" gap={3} maxW={1000}>
    <Banner>default / neutral</Banner>
    <Banner color="info">info</Banner>
    <Banner color="success">success</Banner>
    <Banner color="danger">danger</Banner>
    <Banner color="warning">warning</Banner>
  </x.div>
);

export const OvercapacityBanners = () => (
  <x.div display="flex" flexDirection="column" gap={3} maxW={1000}>
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

export default { title: "Banner" };
