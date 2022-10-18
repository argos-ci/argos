import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Alert } from "@argos-ci/app/src/components";

const main = {
  title: "Alert",
};

export default main;

export const Primary = () => (
  <x.div display="flex" flexDirection="column" gap={3} maxW={600}>
    <Alert>default alert (neutral)</Alert>
    <Alert color="info">info alert</Alert>
    <Alert color="success">success alert</Alert>
    <Alert color="danger">danger alert</Alert>
    <Alert color="neutral">neutral alert</Alert>
    <Alert color="warning">warning alert</Alert>
  </x.div>
);
