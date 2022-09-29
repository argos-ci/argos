import { forwardRef } from "react";
import { x } from "@xstyled/styled-components";
import type { Options, SystemComponent } from "./types";

export const Container: SystemComponent<Options<"div">> = forwardRef(
  (props, ref) => (
    <x.div ref={ref} maxW={1024} mx="auto" px={{ _: 4, sm: 8 }} {...props} />
  )
);
