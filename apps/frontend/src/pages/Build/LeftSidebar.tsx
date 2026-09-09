import { memo, startTransition, useCallback, useRef } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { PillTab, TabList, TabPanel, Tabs } from "@/ui/Tab";

import { BuildDiffList } from "./BuildDiffList";
import { useSearchModeState, useSearchState } from "./BuildDiffState";
import { BuildInfos } from "./BuildInfos";
import { BuildParams } from "./BuildParams";
import { FilterButton } from "./metadata/filters/FilterButton";
import { FilterChips } from "./metadata/filters/FilterChips";

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
    // `pl-1` keeps the magnifier off the sidebar's edge, in line with the icons
    // the list below starts its rows with.
    <div className="relative flex-1 pl-1">
      <SearchIcon className="text-low pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2" />
      <input
        ref={ref}
        type="text"
        autoFocus
        placeholder="Find..."
        // `block` and `leading-6` make the field exactly as tall as a pill tab
        // (24px), so the row search takes over keeps the height it has in tabs
        // mode and its hairline stays level with the toolbar's. Left inline, the
        // field would sit in a line box 2px taller than itself — the space under
        // its baseline — and the whole row would grow by those 2px.
        className="text-default placeholder:text-low block w-full bg-transparent pr-2 pl-6 text-xs leading-6 outline-hidden"
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
      defaultValue={!build.stats?.total ? "info" : "snapshots"}
      className="group/sidebar flex min-h-0 flex-1 shrink-0 flex-col"
    >
      {build.type !== BuildType.Skipped ? (
        <div className="border-b-thin flex shrink-0 items-center gap-1 p-3 px-2">
          {searchMode ? (
            <>
              <SearchInput ref={searchInputRef} />
              <HotkeyTooltip
                keys={leaveSearchModeHotKey.displayKeys}
                description="Exit search mode"
              >
                <Button
                  variant="ghost"
                  iconOnly
                  size="small"
                  onClick={() => setSearchMode(false)}
                >
                  <XIcon />
                </Button>
              </HotkeyTooltip>
            </>
          ) : (
            <>
              <TabList
                className="flex flex-1 shrink-0 gap-2"
                aria-label="Build details"
              >
                <PillTab value="snapshots">Snapshots</PillTab>
                <PillTab value="info">Info</PillTab>
              </TabList>
              <HotkeyTooltip
                keys={searchModeHotKey.displayKeys}
                description="Find"
              >
                <Button
                  variant="ghost"
                  iconOnly
                  onClick={() => enterSearchMode()}
                  size="small"
                >
                  <SearchIcon />
                </Button>
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
            <TabPanel
              value="snapshots"
              className="flex min-h-0 flex-1 flex-col"
            >
              <FilterChips />
              <BuildDiffList />
            </TabPanel>
          ) : null}

          <TabPanel value="info" className="flex-1 overflow-auto p-4">
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
