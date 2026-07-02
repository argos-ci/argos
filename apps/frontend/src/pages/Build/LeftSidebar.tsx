import { memo, startTransition, useCallback, useRef } from "react";
import clsx from "clsx";
import { HomeIcon, SearchIcon, XIcon } from "lucide-react";
import {
  Tab as RACTab,
  TabList as RACTabList,
  TabPanel,
  TabProps,
  Tabs,
} from "react-aria-components";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { HeadlessLink } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

import { BuildDiffList } from "./BuildDiffList";
import { useSearchModeState, useSearchState } from "./BuildDiffState";
import { BuildInfos } from "./BuildInfos";
import { BuildParams, getBuildOverviewURL } from "./BuildParams";
import { FilterButton } from "./metadata/filters/FilterButton";
import { FilterChips } from "./metadata/filters/FilterChips";

const tabItemClassName = clsx(
  "text-low rac-focus cursor-default rounded-sm px-2 text-sm leading-6 font-medium",
  "data-hovered:bg-ui",
  "data-selected:text-default data-selected:bg-ui",
);

function Tab(
  props: TabProps & {
    ref?: React.Ref<HTMLDivElement>;
  },
) {
  return <RACTab className={tabItemClassName} {...props} />;
}

/**
 * Link to the build overview, styled to match — and sit alongside — the sidebar
 * tabs (same pill style and height).
 */
function OverviewButton(props: { params: BuildParams }) {
  const { params } = props;
  const selected = params.diffId == null;
  return (
    <Tooltip content="Overview">
      <HeadlessLink
        href={getBuildOverviewURL(params)}
        aria-label="Overview"
        aria-current={selected ? "page" : undefined}
        className={clsx(
          tabItemClassName,
          "flex h-6 items-center",
          selected && "bg-ui text-default",
        )}
      >
        <HomeIcon className="size-4" />
      </HeadlessLink>
    </Tooltip>
  );
}

const _BuildFragment = graphql(`
  fragment BuildLeftSidebar_Build on Build {
    ...BuildInfos_Build
    type
    stats {
      total
    }
  }
`);

function SearchInput({ ref }: { ref: React.Ref<HTMLInputElement> }) {
  const { search, setSearch } = useSearchState();
  return (
    <div className="relative flex-1">
      <SearchIcon className="text-low pointer-events-none absolute my-4 size-4" />
      <input
        ref={ref}
        type="text"
        autoFocus
        placeholder="Find..."
        className="text-default placeholder:text-low w-full bg-transparent py-3 pr-2 pl-6 text-xs leading-6 outline-hidden"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
          }
        }}
      />
    </div>
  );
}

export const BuildLeftSidebar = memo(function BuildLeftSidebar(props: {
  repoUrl: string | null;
  build: DocumentType<typeof _BuildFragment>;
  params: BuildParams;
}) {
  return (
    <div className="bg-app border-r-thin flex min-h-0 w-73.75 shrink-0 flex-col">
      <LeftSidebarTabs {...props} />
    </div>
  );
});

const LeftSidebarTabs = memo(function LeftSidebarTabs(props: {
  repoUrl: string | null;
  build: DocumentType<typeof _BuildFragment>;
  params: BuildParams;
}) {
  const { build } = props;
  const hasOverview = (build.stats?.total ?? 0) > 0;
  const { searchMode, setSearchMode } = useSearchModeState();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const enterSearchMode = useCallback(() => {
    startTransition(() => {
      setSearchMode(true);
    });
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [setSearchMode]);
  const leaveSearchModeHotKey = useBuildHotkey(
    "leaveSearchMode",
    () => {
      setSearchMode(false);
    },
    {
      allowInInput: true,
    },
  );
  const searchModeHotKey = useBuildHotkey("enterSearchMode", enterSearchMode, {
    allowInInput: true,
  });
  return (
    <Tabs
      defaultSelectedKey={!build.stats?.total ? "info" : "snapshots"}
      className="group/sidebar flex min-h-0 flex-1 shrink-0 flex-col"
    >
      {build.type !== BuildType.Skipped ? (
        <div className="border-b-thin flex shrink-0 items-center gap-1 px-2">
          {hasOverview ? <OverviewButton params={props.params} /> : null}
          {searchMode ? (
            <>
              <SearchInput ref={searchInputRef} />
              <HotkeyTooltip
                keys={leaveSearchModeHotKey.displayKeys}
                description="Exit search mode"
              >
                <IconButton size="small" onPress={() => setSearchMode(false)}>
                  <XIcon />
                </IconButton>
              </HotkeyTooltip>
            </>
          ) : (
            <>
              <RACTabList
                className="flex flex-1 shrink-0 gap-2 py-3"
                aria-label="Build details"
              >
                <Tab id="snapshots">Snapshots</Tab>
                <Tab id="info">Info</Tab>
              </RACTabList>
              <HotkeyTooltip
                keys={searchModeHotKey.displayKeys}
                description="Find"
              >
                <IconButton
                  onPress={() => enterSearchMode()}
                  aria-pressed={searchMode}
                  size="small"
                >
                  <SearchIcon />
                </IconButton>
              </HotkeyTooltip>
            </>
          )}
          <FilterButton />
        </div>
      ) : null}

      {searchMode ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <FilterChips />
          <BuildDiffList />
        </div>
      ) : (
        <>
          {build.type !== BuildType.Skipped ? (
            <TabPanel id="snapshots" className="flex min-h-0 flex-1 flex-col">
              <FilterChips />
              <BuildDiffList />
            </TabPanel>
          ) : null}

          <TabPanel id="info" className="flex-1 overflow-auto p-4">
            <BuildInfos
              build={build}
              repoUrl={props.repoUrl}
              params={props.params}
            />
          </TabPanel>
        </>
      )}
    </Tabs>
  );
});
