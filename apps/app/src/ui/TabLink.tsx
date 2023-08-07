import {
  Tab,
  TabList,
  TabListProps,
  TabPanel,
  TabProps,
  TabStateProps,
  useTabState,
} from "ariakit/tab";
import { clsx } from "clsx";
import { forwardRef } from "react";
import {
  useHref,
  useLinkClickHandler,
  useLocation,
  useNavigate,
} from "react-router-dom";

export const TabLinkList = forwardRef<HTMLDivElement, TabListProps>(
  ({ className, ...props }, ref) => {
    return (
      <TabList
        ref={ref}
        className={clsx(className, "container relative mx-auto px-1")}
        {...props}
      />
    );
  },
);

export const TabLinkPanel = TabPanel;

type TabLinkProps = TabProps<"a"> & { to: string };

export const TabLink = forwardRef<HTMLAnchorElement, TabLinkProps>(
  ({ to, className, ...props }, ref) => {
    const href = useHref(to);
    const onClick = useLinkClickHandler(to);
    return (
      <Tab
        ref={ref}
        as="a"
        className={clsx(
          className,
          "z-10 -mb-px inline-block border-b-2 border-b-transparent px-3 py-3 text-sm font-medium text-low transition hover:text aria-selected:cursor-default aria-selected:border-b-current aria-selected:text",
        )}
        href={href}
        onClick={onClick}
        id={href}
        {...props}
      />
    );
  },
);

export function useTabLinkState(props: TabStateProps = {}) {
  const { pathname: selectedId } = useLocation();
  const navigate = useNavigate();

  const tab = useTabState({
    ...props,
    selectedId,
    setSelectedId: (id) => {
      // setSelectedId may be called more than once for the same id, so we make
      // sure we only navigate once.
      if (id !== selectedId) {
        navigate(id || "/");
      }
    },
  });

  return tab;
}
