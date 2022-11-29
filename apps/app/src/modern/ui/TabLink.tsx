import {
  Tab,
  TabList,
  TabListProps,
  TabPanel,
  TabProps,
  TabStateProps,
  useTabState,
} from "ariakit/tab";
import clsx from "clsx";
import {
  useHref,
  useLinkClickHandler,
  useLocation,
  useNavigate,
} from "react-router-dom";

export const TabLinkList = (props: TabListProps) => {
  return <TabList className="container relative mx-auto px-1" {...props} />;
};

export const TabLinkPanel = TabPanel;

type TabLinkProps = TabProps<"a"> & { to: string };

export function TabLink({ to, className, ...props }: TabLinkProps) {
  const href = useHref(to);
  const onClick = useLinkClickHandler(to);
  return (
    <Tab
      {...props}
      as="a"
      className={clsx(
        className,
        "z-10 -mb-[1px] inline-block border-b border-b-transparent px-3 py-3 text-sm font-medium text-on-light transition hover:text-on aria-selected:cursor-default aria-selected:border-b-white aria-selected:text-on"
      )}
      href={href}
      onClick={onClick}
    />
  );
}

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
