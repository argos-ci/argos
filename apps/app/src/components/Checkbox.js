import * as React from "react";
import { x } from "@xstyled/styled-components";
import { Checkbox as AriakitCheckbox } from "ariakit/checkbox";

export const Checkbox = (props) => <x.div as={AriakitCheckbox} {...props} />;
