import { useState } from "react";
import { invariant } from "@argos/util/invariant";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  FolderCodeIcon,
  PencilIcon,
  PlusCircleIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { expect, screen, waitFor } from "storybook/test";

import { Button } from "../Button";
import { ButtonGroup } from "../ButtonGroup";
import { openOverlayParameters, OverlayStage } from "../storyOverlay";
import {
  Menu,
  MenuHeading,
  MenuItem,
  MenuItemTooltip,
  MenuLoader,
  MenuRoot,
  MenuSection,
  MenuSeparator,
  MenuText,
  MenuTrigger,
  SubMenu,
  SubMenuContent,
} from "./index";

const meta = {
  title: "UI/MenuKit",
  component: Menu,
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Every menu below is the same component. What changes is what it is given —
 * the search field, the checkboxes and the empty states are not separate
 * variants, they are behaviours the menu already has.
 */
function Case(props: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-thin flex min-w-72 flex-col rounded-lg p-4">
      <h3 className="mb-1 text-sm font-medium">{props.title}</h3>
      <p className="text-low mb-3 text-xs">{props.description}</p>
      <div className="flex min-h-10 items-start">{props.children}</div>
    </div>
  );
}

export const Closed: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      <Case
        title="Basic"
        description="Icons, a danger row, a disabled row and a separator."
      >
        <MenuRoot>
          <MenuTrigger>
            <Button variant="secondary">Actions</Button>
          </MenuTrigger>
          <Menu aria-label="Actions">
            <MenuItem icon={<PencilIcon />} keyboardShortcut={["⌘", "E"]}>
              Edit
            </MenuItem>
            <MenuItem icon={<CopyIcon />}>Duplicate</MenuItem>
            <MenuItem disabled>Transfer ownership</MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2Icon />} variant="danger">
              Delete
            </MenuItem>
          </Menu>
        </MenuRoot>
      </Case>
    </div>
  ),
};

/** The plain list, open, with the shapes a row can take. */
export const Open: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Actions</Button>
        </MenuTrigger>
        <Menu aria-label="Actions">
          <MenuSection>
            <MenuHeading>Actions</MenuHeading>
            <MenuItem icon={<PencilIcon />} keyboardShortcut={["⌘", "E"]}>
              Edit
            </MenuItem>
            <MenuItem icon={<CopyIcon />} suffix="2 copies">
              Duplicate
            </MenuItem>
            <MenuItem disabled>Transfer ownership</MenuItem>
          </MenuSection>
          <MenuSeparator />
          <MenuSection>
            <MenuHeading>Danger zone</MenuHeading>
            <MenuItem icon={<Trash2Icon />} variant="danger">
              Delete
            </MenuItem>
          </MenuSection>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
};

/** Subtitles, and the many-of-many shape the reviewers picker needs. */
export const OpenWithSubtitles: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Reviewers</Button>
        </MenuTrigger>
        <Menu aria-label="Project members">
          <MenuItem checkbox subtitle="jsfez">
            Jeremy Sfez
          </MenuItem>
          <MenuItem checkbox checked subtitle="gregberge">
            Greg Bergé
          </MenuItem>
          <MenuItem checkbox disabled subtitle="already reviewed">
            Kyle Bertolino
          </MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
};

/** `checked` reads as a trailing glyph, or as a highlighted row. */
export const OpenWithChecked: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <div className="flex gap-8">
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">Glyph</Button>
          </MenuTrigger>
          <Menu aria-label="Sort by">
            <MenuItem checked>Most recent</MenuItem>
            <MenuItem>Name</MenuItem>
            <MenuItem>Status</MenuItem>
          </Menu>
        </MenuRoot>
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">Highlight</Button>
          </MenuTrigger>
          <Menu aria-label="Sort by" checkedIndicator="highlight">
            <MenuItem checked>Most recent</MenuItem>
            <MenuItem>Name</MenuItem>
            <MenuItem>Status</MenuItem>
          </Menu>
        </MenuRoot>
      </div>
    </OverlayStage>
  ),
};

/** A permanent search field, the shape the project switcher wants. */
export const OpenWithSearch: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Switch project</Button>
        </MenuTrigger>
        <Menu aria-label="Projects" search="Search projects…">
          <MenuSection>
            <MenuHeading>Switch project</MenuHeading>
            <MenuItem icon={<FolderCodeIcon />}>argos</MenuItem>
            <MenuItem icon={<FolderCodeIcon />}>sparkle</MenuItem>
            <MenuItem icon={<FolderCodeIcon />}>website</MenuItem>
          </MenuSection>
          <MenuSeparator />
          <MenuItem icon={<PlusCircleIcon />} filterPriority={0}>
            Create a project
          </MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
};

/** Nothing to show at all, and nothing left after a query. */
export const OpenEmpty: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <div className="flex gap-8">
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">Empty</Button>
          </MenuTrigger>
          <Menu aria-label="Empty" emptyPlaceholder="No projects yet">
            {null}
          </Menu>
        </MenuRoot>
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">No results</Button>
          </MenuTrigger>
          <Menu
            aria-label="No results"
            search="Search projects…"
            noResultsPlaceholder="No matching projects"
          >
            <MenuItem>argos</MenuItem>
            <MenuItem>sparkle</MenuItem>
          </Menu>
        </MenuRoot>
      </div>
    </OverlayStage>
  ),
};

/**
 * A long list scrolls rather than growing past the viewport, and holds its
 * position while a query shortens it.
 *
 * The assertion below passes with or without that fix: at this stage size the
 * menu fits under the trigger either way, so it never had to move. Reproducing
 * the jump needs a trigger low enough that a full-height menu does not fit.
 */
export const OpenLongList: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Many projects</Button>
        </MenuTrigger>
        <Menu aria-label="Projects" search="Search projects…">
          {Array.from({ length: 40 }, (_, index) => (
            <MenuItem key={index} icon={<FolderCodeIcon />}>
              {`project-${index + 1}`}
            </MenuItem>
          ))}
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
  play: async ({ userEvent }) => {
    const list = await screen.findByRole("listbox", { name: "Projects" });
    // The popup zooms in, and a transform moves the measured rect, so wait for
    // the entrance to settle before taking the baseline.
    const settle = async () => {
      let previous = Number.NaN;
      await waitFor(() => {
        const top = list.getBoundingClientRect().top;
        const stable = top === previous;
        previous = top;
        expect(stable).toBe(true);
      });
      return previous;
    };
    const before = await settle();
    const field = await screen.findByLabelText("Search projects…");
    await userEvent.type(field, "project-1");
    await expect(await screen.findByText("project-1")).toBeVisible();
    await expect(await settle()).toBe(before);
  },
};

/** Checkboxes keep the menu open, which is what a filter needs. */
export const OpenWithCheckboxes: Story = {
  parameters: openOverlayParameters,
  render: function Render() {
    const [selected, setSelected] = useState<string[]>(["accepted"]);
    const statuses = ["accepted", "rejected", "pending", "expired"];
    return (
      <OverlayStage>
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">Status</Button>
          </MenuTrigger>
          <Menu aria-label="Build status">
            {statuses.map((status) => (
              <MenuItem
                key={status}
                checkbox
                checked={selected.includes(status)}
                onCheckedChange={(checked) => {
                  setSelected((previous) =>
                    checked
                      ? [...previous, status]
                      : previous.filter((item) => item !== status),
                  );
                }}
              >
                {status}
              </MenuItem>
            ))}
          </Menu>
        </MenuRoot>
      </OverlayStage>
    );
  },
};

/**
 * A filter's two answers in one list: the box adds a status to the selection
 * and leaves the menu up, the rest of the row narrows to that one and closes.
 */
export const OpenWithSplitCheckboxes: Story = {
  parameters: openOverlayParameters,
  render: function Render() {
    const [selected, setSelected] = useState<string[]>([
      "accepted",
      "rejected",
    ]);
    const statuses = ["accepted", "rejected", "pending", "expired"];
    return (
      <OverlayStage>
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">Status ({selected.length})</Button>
          </MenuTrigger>
          <Menu aria-label="Build status">
            {statuses.map((status) => (
              <MenuItem
                key={status}
                checkbox
                checked={selected.includes(status)}
                onAction={() => setSelected([status])}
                onCheckedChange={(checked) => {
                  setSelected((previous) =>
                    checked
                      ? [...previous, status]
                      : previous.filter((item) => item !== status),
                  );
                }}
              >
                {status}
              </MenuItem>
            ))}
          </Menu>
        </MenuRoot>
      </OverlayStage>
    );
  },
  play: async ({ userEvent }) => {
    const list = await screen.findByRole("listbox", { name: "Build status" });
    const row = await screen.findByRole("option", { name: "pending" });
    const box = row.querySelector("[data-menu-item-checkbox]");
    invariant(box instanceof HTMLElement, "the row has a box of its own");

    // The box adds to the selection and the list survives the press.
    await userEvent.click(box);
    await expect(
      await screen.findByRole("button", { name: "Status (3)" }),
    ).toBeVisible();
    await expect(list).toBeVisible();

    // The rest of the row narrows to that one and takes the menu with it.
    await userEvent.click(
      await screen.findByRole("option", { name: "accepted" }),
    );
    await expect(
      await screen.findByRole("button", { name: "Status (1)" }),
    ).toBeVisible();
    await waitFor(() => expect(list).not.toBeInTheDocument());
  },
};

/** An explicit search field, plus rows that carry hidden keywords. */
export const OpenWithKeywords: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Settings</Button>
        </MenuTrigger>
        <Menu aria-label="Settings" search="Find a setting…">
          <MenuItem
            icon={<SettingsIcon />}
            keywords={["preferences", "config"]}
          >
            General
          </MenuItem>
          <MenuItem icon={<DownloadIcon />} keywords={["export", "backup"]}>
            Data
          </MenuItem>
          <MenuItem
            icon={<Trash2Icon />}
            variant="danger"
            keywords={["remove"]}
          >
            Delete project
          </MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
};

/**
 * Typing filters, and a pinned row survives it. No screenshot proves this —
 * the filtering is the whole point of the component, so it is asserted.
 */
export const FiltersOnType: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Switch project</Button>
        </MenuTrigger>
        <Menu aria-label="Projects" search="Search projects…">
          <MenuItem icon={<FolderCodeIcon />}>argos</MenuItem>
          <MenuItem icon={<FolderCodeIcon />}>sparkle</MenuItem>
          <MenuItem icon={<FolderCodeIcon />}>website</MenuItem>
          <MenuItem icon={<PlusCircleIcon />} filterPriority={0}>
            Create a project
          </MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
  play: async ({ userEvent }) => {
    const field = await screen.findByLabelText("Search projects…");
    await userEvent.type(field, "spark");
    await expect(await screen.findByText("sparkle")).toBeVisible();
    await expect(screen.queryByText("website")).not.toBeInTheDocument();
    // `filterPriority` keeps this one whatever the query.
    await expect(screen.getByText("Create a project")).toBeVisible();
  },
};

/**
 * The same, with no search field asked for: the menu carries a hidden one, so
 * typing filters and reveals it.
 */
export const ImplicitSearch: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Actions</Button>
        </MenuTrigger>
        <Menu aria-label="Actions">
          <MenuItem icon={<PencilIcon />}>Edit</MenuItem>
          <MenuItem icon={<CopyIcon />}>Duplicate</MenuItem>
          <MenuItem icon={<Trash2Icon />} variant="danger">
            Delete
          </MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
  play: async ({ userEvent }) => {
    const field = await screen.findByLabelText("Filter items");
    await userEvent.type(field, "dup");
    await expect(await screen.findByText("Duplicate")).toBeVisible();
    await expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  },
};

/**
 * A submenu opens beside its row, on hover or with the right arrow — and its
 * items are reachable from the parent's search without opening it.
 */
export const OpenWithSubmenu: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Image actions</Button>
        </MenuTrigger>
        <Menu aria-label="Image actions">
          <MenuItem icon={<PencilIcon />}>Open in new tab</MenuItem>
          <SubMenu>
            <MenuItem icon={<CopyIcon />}>Copy image</MenuItem>
            <SubMenuContent>
              <MenuItem>as PNG</MenuItem>
              <MenuItem>as JPEG</MenuItem>
            </SubMenuContent>
          </SubMenu>
          <SubMenu>
            <MenuItem icon={<DownloadIcon />}>Download</MenuItem>
            <SubMenuContent>
              <MenuItem>Baseline</MenuItem>
              <MenuItem>Changes</MenuItem>
            </SubMenuContent>
          </SubMenu>
          <MenuSeparator />
          <MenuItem icon={<Trash2Icon />} variant="danger">
            Delete
          </MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
};

/** A submenu's items answer the parent's search, shown under their row. */
export const SubmenuItemsAreSearchable: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Image actions</Button>
        </MenuTrigger>
        <Menu aria-label="Image actions" search="Search actions…">
          <MenuItem icon={<PencilIcon />}>Open in new tab</MenuItem>
          <SubMenu>
            <MenuItem icon={<CopyIcon />}>Copy image</MenuItem>
            <SubMenuContent>
              <MenuItem>as PNG</MenuItem>
              <MenuItem>as JPEG</MenuItem>
            </SubMenuContent>
          </SubMenu>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
  play: async ({ userEvent }) => {
    const field = await screen.findByLabelText("Search actions…");
    await userEvent.type(field, "png");
    // Surfaced from inside the submenu, under the row it lives in.
    await expect(await screen.findByText("as PNG")).toBeVisible();
    await expect(screen.getAllByText("Copy image").length).toBeGreaterThan(0);
    await expect(screen.queryByText("Open in new tab")).not.toBeInTheDocument();
    await expect(screen.queryByText("as JPEG")).not.toBeInTheDocument();
  },
};

/**
 * A row that renders a component — an account with its avatar, say — carries
 * no text the walker can see. `textValue` is what the query matches, and
 * `keywords` extend it: the account switcher answers to the display name and
 * the slug alike.
 */
export const ElementRowsAreSearchable: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Accounts</Button>
        </MenuTrigger>
        <Menu aria-label="Accounts" search="Search accounts…">
          <MenuItem textValue="Smooth Corp" keywords={["smooth"]}>
            <span className="flex items-center gap-2">
              <span className="bg-primary-active size-4.5 rounded-full" />
              Smooth Corp
            </span>
          </MenuItem>
          <MenuItem textValue="Big Team" keywords={["big"]}>
            <span className="flex items-center gap-2">
              <span className="bg-active size-4.5 rounded-full" />
              Big Team
            </span>
          </MenuItem>
          <MenuItem icon={<PlusCircleIcon />} filterPriority={0}>
            Create a Team
          </MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
  play: async ({ userEvent }) => {
    const field = await screen.findByLabelText("Search accounts…");
    // By display name…
    await userEvent.type(field, "smoo");
    await expect(await screen.findByText("Smooth Corp")).toBeVisible();
    await expect(screen.queryByText("Big Team")).not.toBeInTheDocument();
    // …and by slug, which only the keywords know.
    await userEvent.clear(field);
    await userEvent.type(field, "big");
    await expect(await screen.findByText("Big Team")).toBeVisible();
    await expect(screen.queryByText("Smooth Corp")).not.toBeInTheDocument();
  },
};

/**
 * The rows that are not items: links that navigate, a loader while a list is
 * being fetched, a line of prose, and an explanation pinned to a row.
 */
export const OpenWithFillerRows: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <div className="flex gap-8">
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">Account</Button>
          </MenuTrigger>
          <Menu aria-label="Account">
            <MenuItem icon={<PlusCircleIcon />} href="/teams/new">
              New Team
            </MenuItem>
            <MenuItem icon={<SettingsIcon />} href="/settings">
              Settings
            </MenuItem>
            <MenuItem
              icon={<DownloadIcon />}
              href="https://argos-ci.com/docs"
              target="_blank"
            >
              Documentation
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              variant="danger"
              disabled
              suffix={<MenuItemTooltip content="You are the last owner." />}
            >
              Leave team
            </MenuItem>
          </Menu>
        </MenuRoot>
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary">Loading</Button>
          </MenuTrigger>
          <Menu aria-label="Projects">
            <MenuSection>
              <MenuHeading>Switch project</MenuHeading>
              <MenuLoader />
            </MenuSection>
            <MenuSeparator />
            <MenuText>Only your own projects are listed.</MenuText>
          </Menu>
        </MenuRoot>
      </div>
    </OverlayStage>
  ),
};

/** A link row is a real anchor, so it can be opened in a new tab. */
export const LinkRowsAreAnchors: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <MenuRoot defaultOpen>
        <MenuTrigger>
          <Button variant="secondary">Account</Button>
        </MenuTrigger>
        <Menu aria-label="Account">
          <MenuItem href="/teams/new">New Team</MenuItem>
          <MenuItem href="codex://prompt">Open in Codex</MenuItem>
        </Menu>
      </MenuRoot>
    </OverlayStage>
  ),
  play: async () => {
    const inApp = await screen.findByText("New Team");
    // Routed by the client router, so it carries an href without a full load.
    await expect(inApp.closest("a")).toHaveAttribute("href", "/teams/new");
    // A scheme the router must not claim stays a plain anchor.
    const deepLink = await screen.findByText("Open in Codex");
    await expect(deepLink.closest("a")).toHaveAttribute(
      "href",
      "codex://prompt",
    );
  },
};

/**
 * A split button, the shape the review prompt uses: an action beside a menu
 * trigger, sharing one pill.
 *
 * Worth its own story because the trigger's popover renders focus guards next
 * to it while open, and the group's rounding used to be decided by child
 * position — so the corner squared off the moment the menu opened.
 */
export const OpenSplitButton: Story = {
  parameters: openOverlayParameters,
  render: () => (
    <OverlayStage>
      <ButtonGroup>
        <Button variant="secondary">Open in Claude</Button>
        <MenuRoot defaultOpen>
          <MenuTrigger>
            <Button variant="secondary" iconOnly aria-label="Choose an agent">
              <ChevronDownIcon />
            </Button>
          </MenuTrigger>
          <Menu side="bottom" align="end" aria-label="Agent prompts">
            <MenuItem icon={<CopyIcon />}>Review build</MenuItem>
            <MenuItem icon={<PencilIcon />}>Handle comments</MenuItem>
          </Menu>
        </MenuRoot>
      </ButtonGroup>
    </OverlayStage>
  ),
};
