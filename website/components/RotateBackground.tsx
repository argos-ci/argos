import { forwardRef } from "react";
import { x } from "@xstyled/styled-components";

import type { As, Options, SystemComponent } from "./types";

export type RotateBackgroundOptions<T extends As = "div"> = Options<T> & {
  children: React.ReactNode;
};

export const RotateBackground: SystemComponent<RotateBackgroundOptions> =
  forwardRef(({ children, ...props }, ref) => (
    <x.div ref={ref} transform rotate={-6} mx={-20} {...props}>
      <x.div transform rotate={6} mx={20}>
        {children}
      </x.div>
    </x.div>
  ));
