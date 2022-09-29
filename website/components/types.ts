import { ITheme } from "@xstyled/styled-components";
import type { SystemProps } from "@xstyled/styled-components";
import "@xstyled/system";
import "styled-components";

import { Theme as ArgosTheme } from "./Theme";

declare module "@xstyled/system" {
  export interface Theme extends ITheme, ArgosTheme {}
}

declare module "styled-components" {
  export interface DefaultTheme extends ITheme, ArgosTheme {}
}

/**
 * The `as` prop.
 * @template P Props
 */
export type As<P = any> = React.ElementType<P>;

/**
 * Props with the `as` prop.
 * @template T The `as` prop
 * @example
 * type ButtonOptions = Options<"button">;
 */
export type Options<T extends As = any> = {
  as?: T;
};

/**
 * Props that automatically includes HTML props based on the `as` prop.
 * @template O Options
 * @example
 * type ButtonHTMLProps = HTMLProps<Options<"button">>;
 */
export type HTMLProps<O extends Options> = {
  children?: React.ReactNode;
  [index: `data-${string}`]: unknown;
} & Omit<
  React.ComponentPropsWithRef<NonNullable<O["as"]>>,
  keyof O | "children" | "color"
>;

/**
 * Options & HTMLProps
 * @template O Options
 * @example
 * type ButtonProps = Props<Options<"button">>;
 */
export type Props<O extends Options> = O & HTMLProps<O>;

/**
 * A component that supports the `as` prop.
 * @template O Options
 * @example
 * type ButtonComponent = Component<Options<"button">>;
 */
export type Component<O extends Options> = {
  <T extends As>(
    props: Omit<O, "as"> &
      Omit<HTMLProps<Options<T>>, keyof O> &
      Required<Options<T>>
  ): JSX.Element | null;
  (props: Props<O>): JSX.Element | null;
  displayName?: string;
};

/**
 * A component that supports the `as` prop and extends xstyled system.
 * @template O Options
 * @example
 * type ButtonComponent = Component<Options<"button">>;
 */
export type SystemComponent<O extends Options> = Component<
  O & Omit<SystemProps & { color?: any }, keyof O>
>;
