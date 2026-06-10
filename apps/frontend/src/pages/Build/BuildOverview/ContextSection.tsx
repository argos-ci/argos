import {
  ClockIcon,
  GitBranchIcon,
  GitPullRequestArrowIcon,
  GitPullRequestIcon,
  ImagesIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  SunIcon,
  SunMoonIcon,
  TowerControlIcon,
} from "lucide-react";

import { BuildModeLabel } from "@/containers/BuildModeIndicator";
import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildType } from "@/gql/graphql";
import { Time } from "@/ui/Time";
import { Truncable } from "@/ui/Truncable";

import { AutomationLibraryIcon } from "../metadata/automationLibrary/AutomationLibraryIcon";
import { BrowserIcon } from "../metadata/browser/BrowserIcon";
import { SectionHeader } from "./shared";

const _BuildFragment = graphql(`
  fragment ContextSection_Build on Build {
    type
    mode
    storybook
    createdAt
    branch
    baseBranch
    baseBuild {
      id
      number
    }
    stats {
      total
    }
    impactAnalysis {
      buildBrowsers
      buildViewports
      buildColorSchemes
      buildAutomationLibraries
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

const browserLabels: Record<string, string> = {
  chrome: "Chrome",
  chromium: "Chromium",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  webkit: "WebKit",
};

function getBrowserLabel(browser: string): string {
  return (
    browserLabels[browser.toLowerCase()] ??
    browser.charAt(0).toUpperCase() + browser.slice(1)
  );
}

const automationLibraryLabels: Record<string, string> = {
  storybook: "Storybook",
  "@storybook/test-runner": "Storybook",
  "@storybook/addon-vitest": "Storybook",
  playwright: "Playwright",
  "@playwright/test": "Playwright",
  "playwright-core": "Playwright",
  cypress: "Cypress",
  puppeteer: "Puppeteer",
  webdriverio: "WebdriverIO",
  selenium: "Selenium",
};

function getAutomationLibraryLabel(library: string): string {
  return (
    automationLibraryLabels[library.toLowerCase()] ??
    library.charAt(0).toUpperCase() + library.slice(1)
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Single icon representing the color schemes covered by the build. */
function ColorSchemeIcon(props: {
  colorSchemes: string[];
  className?: string;
}) {
  const { colorSchemes, className } = props;
  const Icon =
    colorSchemes.length === 1
      ? colorSchemes[0] === "dark"
        ? MoonIcon
        : SunIcon
      : SunMoonIcon;
  return <Icon className={className} />;
}

function DefinitionRow(props: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-4 text-sm">
      <span className="text-low">{props.label}</span>
      <span className="text-default flex min-w-0 items-center gap-2 font-medium">
        {props.icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center">
            {props.icon}
          </span>
        ) : null}
        <Truncable className="min-w-0">{props.children}</Truncable>
      </span>
    </div>
  );
}

/**
 * Definition list of the build's technical context: framework, browser,
 * viewports, color schemes, screenshot count, baseline, and creation date.
 */
export function ContextSection(props: { build: Build }) {
  const { build } = props;
  const { branch, baseBranch, baseBuild, impactAnalysis: analysis } = build;
  const browsers = analysis?.buildBrowsers ?? [];
  const viewports = analysis?.buildViewports ?? [];
  const colorSchemes = analysis?.buildColorSchemes ?? [];
  const automationLibraries = analysis?.buildAutomationLibraries ?? [];
  const frameworkName =
    automationLibraries[0] ?? (build.storybook ? "storybook" : null);
  const frameworkLabel =
    automationLibraries.length > 0
      ? automationLibraries.map(getAutomationLibraryLabel).join(", ")
      : build.storybook
        ? "Storybook"
        : null;
  return (
    <section>
      <SectionHeader>Context</SectionHeader>
      <div className="flex flex-col gap-3.5">
        {frameworkLabel && frameworkName ? (
          <DefinitionRow
            label="Framework"
            icon={
              <AutomationLibraryIcon
                name={frameworkName}
                className="text-low size-4 shrink-0"
              />
            }
          >
            {frameworkLabel}
          </DefinitionRow>
        ) : null}
        {browsers.length > 0 ? (
          <DefinitionRow
            label="Browser"
            icon={
              <BrowserIcon
                browser={{ name: browsers[0]! }}
                className="size-4 shrink-0"
              />
            }
          >
            {browsers.map(getBrowserLabel).join(", ")}
          </DefinitionRow>
        ) : null}
        {viewports.length > 0 ? (
          <DefinitionRow
            label="Viewports"
            icon={<MonitorSmartphoneIcon className="text-low size-4" />}
          >
            {viewports.join(", ")}
          </DefinitionRow>
        ) : null}
        {colorSchemes.length > 0 ? (
          <DefinitionRow
            label="Color schemes"
            icon={
              <ColorSchemeIcon
                colorSchemes={colorSchemes}
                className="text-low size-4"
              />
            }
          >
            {colorSchemes.map(capitalize).join(", ")}
          </DefinitionRow>
        ) : null}
        {build.stats ? (
          <DefinitionRow
            label="Screenshots"
            icon={<ImagesIcon className="text-low size-4" />}
          >
            <span className="tabular-nums">{build.stats.total}</span>
          </DefinitionRow>
        ) : null}
        {branch ? (
          <DefinitionRow
            label="Branch"
            icon={<GitBranchIcon className="text-low size-4" />}
          >
            <span className="font-mono">{branch}</span>
          </DefinitionRow>
        ) : null}

        {build.type === BuildType.Orphan ? (
          <DefinitionRow
            label="Compared to"
            icon={<GitPullRequestArrowIcon className="text-low size-4" />}
          >
            <span className="text-low">No baseline yet</span>
          </DefinitionRow>
        ) : baseBranch || baseBuild ? (
          <DefinitionRow
            label="Compared to"
            icon={<GitPullRequestArrowIcon className="text-low size-4" />}
          >
            {baseBranch ?? `Build #${baseBuild!.number}`}
            {baseBranch && baseBuild ? (
              <span className="text-low"> · #{baseBuild.number}</span>
            ) : null}
          </DefinitionRow>
        ) : null}
        <DefinitionRow
          label="Mode"
          icon={
            build.mode === BuildMode.Monitoring ? (
              <TowerControlIcon className="text-low size-4" />
            ) : (
              <GitPullRequestIcon className="text-low size-4" />
            )
          }
        >
          <BuildModeLabel mode={build.mode} />
        </DefinitionRow>
        <DefinitionRow
          label="Created"
          icon={<ClockIcon className="text-low size-4" />}
        >
          <Time date={build.createdAt} />
        </DefinitionRow>
      </div>
    </section>
  );
}
