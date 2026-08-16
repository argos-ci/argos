import type { ComponentPropsWithRef } from "react";
import { Link } from "react-router";

/**
 * Anything carrying its own URL scheme leaves the app: `http://`, `https://`
 * and `mailto:`, but also the deep links that hand a prompt to a coding agent
 * installed on the machine (`claude-cli://`, `codex://`, `cursor://`). React
 * Router must not try to resolve those as in-app paths.
 */
export function checkIsExternalHref(path: string) {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(path) || path.startsWith("mailto:");
}

/**
 * An anchor that routes through React Router.
 *
 * React Aria routed every `href` through a `RouterProvider` mounted at the app
 * root, so any RAC component taking an `href` navigated without a full page
 * load. Base UI has no such hook — its link parts render a plain `<a>` — so the
 * routing moves here, and the parts that take an href render this instead.
 */
export function RouterLink(props: ComponentPropsWithRef<"a">) {
  const { href, ...rest } = props;
  if (!href || checkIsExternalHref(href)) {
    return <a href={href} {...rest} />;
  }
  return <Link to={href} {...rest} />;
}
