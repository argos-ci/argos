import * as React from "react";
import { x } from "@xstyled/styled-components";
import { GroupLabel } from "ariakit/group";
import { Button } from "./Button";

export const ToggleGroupButtons = ({
  state,
  setState,
  switchOnText,
  switchOffText,
  ...props
}) => (
  <x.div as={GroupLabel} display="flex" flexWrap="wrap" {...props}>
    <Button
      borderRadius="md 0 0 md"
      color="secondary"
      py={2}
      disabled={!state}
      onClick={() => setState(false)}
    >
      {switchOnText}
    </Button>
    <Button
      py={2}
      borderRadius="0 md md 0"
      color="secondary"
      disabled={state}
      onClick={() => setState(true)}
    >
      {switchOffText}
    </Button>
  </x.div>
);
