import { ComponentPropsWithoutRef } from "react";

import "./EggLoader.css";

import clsx from "clsx";

export function EggLoader(props: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-visual-test="transparent"
      {...props}
      className={clsx("egg-loader", props.className)}
    />
  );
}
