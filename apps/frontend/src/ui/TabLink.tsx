import { forwardRef } from "react";
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
        className={clsx(className, "container relative mx-auto px-4")}
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
          "text-low hover:text aria-selected:text z-10 -mb-px inline-block border-b-2 border-b-transparent p-3 text-sm font-medium transition aria-selected:cursor-default aria-selected:border-b-current",
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
