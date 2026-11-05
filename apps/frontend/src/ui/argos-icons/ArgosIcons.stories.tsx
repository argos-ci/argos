import type { Meta, StoryObj } from "@storybook/react-vite";
import { clsx } from "clsx";
import {
  EyeIcon as LucideEyeIcon,
  ImageIcon as LucideImageIcon,
  MessageSquareOffIcon as LucideMessageSquareOffIcon,
  ThumbsUpIcon as LucideThumbsUpIcon,
} from "lucide-react";

import { Button, ButtonIcon } from "../Button";
import { ButtonGroup } from "../ButtonGroup";
import { StoryTitle } from "../StoryTitle";
import { Tooltip } from "../Tooltip";
import { iconGroups, type IconEntry } from "./catalog";
import {
  BellOffIcon,
  MessageSquareOffIcon,
  MessageSquarePlusIcon,
} from "./comments";
import { ImageIcon } from "./content";
import { GitPullRequestDraftIcon } from "./git";
import {
  BookMarkedIcon,
  FlaskConicalIcon,
  TagIcon,
  TargetIcon,
} from "./metadata";
import { ChevronLeftIcon, ChevronRightIcon } from "./navigation";
import { ThumbsDownIcon, ThumbsUpIcon } from "./review";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDotIcon,
  CircleXIcon,
  FlagOffIcon,
  WavesIcon,
} from "./status";
import {
  BaselineViewIcon,
  ChangesViewIcon,
  EyeIcon,
  HandIcon,
  LocateFixedIcon,
  OnionViewIcon,
  PaintbrushIcon,
  ScanEyeIcon,
  SplitViewIcon,
  SwipeViewIcon,
} from "./viewer";

const meta = {
  title: "UI/Argos icons",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Light theme tokens resolve on `:root`, so a nested `.dark` only switches
 * the raw Radix scales. The dark panels paint with those directly.
 */
function DarkPanel(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx("dark rounded-lg p-4", props.className)}
      style={{ background: "var(--gray-1)", color: "var(--gray-12)" }}
    >
      {props.children}
    </div>
  );
}

function Principle(props: {
  title: string;
  children: React.ReactNode;
  caption: string;
}) {
  return (
    <section className="flex max-w-3xl flex-col gap-3">
      <StoryTitle>{props.title}</StoryTitle>
      <p className="text-low text-sm">{props.caption}</p>
      {props.children}
    </section>
  );
}

function BeforeAfter(props: {
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-6">
      <div className="text-low flex items-center gap-3 opacity-70">
        {props.before}
      </div>
      <span className="text-low font-mono text-xs">→</span>
      <div className="flex items-center gap-3">{props.after}</div>
    </div>
  );
}

const statuses = [
  { Icon: CircleCheckIcon, className: "text-success", style: "--grass-11" },
  { Icon: CircleAlertIcon, className: "text-warning", style: "--amber-11" },
  { Icon: CircleXIcon, className: "text-danger", style: "--tomato-11" },
  { Icon: CircleDotIcon, className: "text-low", style: "--gray-11" },
  { Icon: ThumbsUpIcon, className: "text-success", style: "--grass-11" },
  { Icon: ThumbsDownIcon, className: "text-danger", style: "--tomato-11" },
];

export const Language: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Principle
        title="Ink and tint"
        caption="The subject of an icon is washed with its own color at 20%; whatever acts on it stays bare ink. The wash follows currentColor, so a status keeps its color in both themes."
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            {statuses.map(({ Icon, className }, index) => (
              <Icon key={index} size={32} className={className} />
            ))}
          </div>
          <DarkPanel className="flex items-center gap-4">
            {statuses.map(({ Icon, style }, index) => (
              <Icon key={index} size={32} style={{ color: `var(${style})` }} />
            ))}
          </DarkPanel>
        </div>
      </Principle>

      <Principle
        title="Soft frames"
        caption="A screen, an image, a document rounds its corners at 3 instead of 2 — the softness of the logo's eye."
      >
        <BeforeAfter
          before={
            <>
              <LucideImageIcon size={48} />
              <LucideThumbsUpIcon size={48} />
            </>
          }
          after={
            <>
              <ImageIcon size={48} />
              <ThumbsUpIcon size={48} />
            </>
          }
        />
      </Principle>

      <Principle
        title="The eye"
        caption="Argos is the hundred-eyed watchman, and the logo is an almond eye. Seeing uses that almond, pointed and with a solid pupil; aiming reuses the pupil."
      >
        <BeforeAfter
          before={<LucideEyeIcon size={48} />}
          after={
            <>
              <EyeIcon size={48} />
              <ScanEyeIcon size={48} />
              <LocateFixedIcon size={48} />
              <TargetIcon size={48} />
            </>
          }
        />
      </Principle>

      <Principle
        title="Absence is a ghost"
        caption="Switched off or held back is the same shape, dashed and unwashed — never a slash through it."
      >
        <BeforeAfter
          before={<LucideMessageSquareOffIcon size={48} />}
          after={
            <>
              <MessageSquareOffIcon size={48} />
              <BellOffIcon size={48} />
              <FlagOffIcon size={48} />
              <GitPullRequestDraftIcon size={48} />
              <BaselineViewIcon size={48} />
            </>
          }
        />
      </Principle>
    </div>
  ),
};

function IconCard({ entry }: { entry: IconEntry }) {
  const { name, Icon, replaced: Replaced, usage } = entry;
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-end gap-3">
        <Icon size={32} />
        <Icon size={24} />
        <Icon size={16} />
        {Replaced ? (
          <span className="text-low ml-auto flex items-center gap-1.5 text-xs">
            was
            <Replaced size={16} />
          </span>
        ) : null}
      </div>
      <div className="font-mono text-xs">{name}</div>
      <div className="text-low text-xs">{usage}</div>
    </div>
  );
}

export const Catalog: Story = {
  render: () => (
    <div className="flex flex-col">
      {iconGroups.map((group) => (
        <section key={group.title}>
          <StoryTitle>{group.title}</StoryTitle>
          <p className="text-low mb-3 text-sm">{group.description}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {group.icons.map((entry, index) => (
              <IconCard key={`${entry.name}-${index}`} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

/**
 * Every group as a strip at button size: the stock icons they replaced over
 * Argos's. A gap holds the place of an icon that was already Argos's own.
 */
function Strips() {
  return (
    <div className="flex flex-col gap-4">
      {iconGroups.map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-2 opacity-60">
            {group.icons.map(({ name, replaced: Replaced }, index) =>
              Replaced ? (
                <Replaced key={`${name}-${index}`} size={16} />
              ) : (
                <span key={`${name}-${index}`} className="size-4" />
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {group.icons.map(({ name, Icon }, index) => (
              <Icon key={`${name}-${index}`} size={16} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export const AtButtonSize: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <div className="rounded-lg border p-4">
        <Strips />
      </div>
      <DarkPanel>
        <Strips />
      </DarkPanel>
    </div>
  ),
};

const viewModes = [
  { label: "Baseline", Icon: BaselineViewIcon },
  { label: "Changes", Icon: ChangesViewIcon },
  { label: "Side by side", Icon: SplitViewIcon },
  { label: "Onion skin", Icon: OnionViewIcon },
  { label: "Swipe", Icon: SwipeViewIcon },
];

const metadataRows = [
  { Icon: FlaskConicalIcon, label: "checkout › pays with a saved card" },
  { Icon: BookMarkedIcon, label: "Checkout/PaymentForm" },
  { Icon: TagIcon, label: "@payment, @smoke" },
  { Icon: TargetIcon, label: "Threshold 0.5%" },
  { Icon: WavesIcon, label: "Flaky — changed in 3 of 20 builds" },
];

export const InContext: Story = {
  render: () => (
    <div className="flex flex-col">
      <StoryTitle>Viewer toolbar</StoryTitle>
      <div className="flex flex-wrap items-center gap-2">
        <ButtonGroup>
          {viewModes.map(({ label, Icon }, index) => (
            <Tooltip key={label} content={label}>
              <Button
                variant="secondary"
                iconOnly
                aria-pressed={index === 2}
                aria-label={label}
              >
                <Icon />
              </Button>
            </Tooltip>
          ))}
        </ButtonGroup>
        <Button variant="secondary" iconOnly aria-pressed aria-label="Overlay">
          <EyeIcon />
        </Button>
        <Button variant="secondary" iconOnly aria-label="Highlight changes">
          <LocateFixedIcon />
        </Button>
        <ButtonGroup>
          <Button variant="secondary" iconOnly aria-label="Pan">
            <HandIcon />
          </Button>
          <Button
            variant="secondary"
            iconOnly
            aria-pressed
            aria-label="Comment"
          >
            <MessageSquarePlusIcon />
          </Button>
        </ButtonGroup>
        <Button variant="secondary" iconOnly aria-label="Ignore change">
          <FlagOffIcon />
        </Button>
        <Button variant="secondary" iconOnly aria-label="Appearance">
          <PaintbrushIcon />
        </Button>
        <ButtonGroup>
          <Button variant="secondary" iconOnly aria-label="Previous change">
            <ChevronLeftIcon />
          </Button>
          <Button variant="secondary" iconOnly aria-label="Next change">
            <ChevronRightIcon />
          </Button>
        </ButtonGroup>
      </div>

      <StoryTitle>Review</StoryTitle>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="success" aria-pressed iconOnly aria-label="Accept">
          <ThumbsUpIcon />
        </Button>
        <Button variant="danger" iconOnly aria-label="Reject">
          <ThumbsDownIcon />
        </Button>
        <Button variant="primary">
          <ButtonIcon>
            <ThumbsUpIcon />
          </ButtonIcon>
          Approve
        </Button>
      </div>

      <StoryTitle>Sidebar metadata</StoryTitle>
      <ul className="flex flex-col gap-1.5 text-sm">
        {metadataRows.map(({ Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="text-low size-4 shrink-0" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  ),
};
