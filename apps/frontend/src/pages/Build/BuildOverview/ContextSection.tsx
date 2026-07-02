import { clsx } from "clsx";
import { MonitorSmartphoneIcon, SunMoonIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { BuildType } from "@/gql/graphql";
import { Link } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { StackedItems } from "@/ui/StackedItems";
import { Truncable } from "@/ui/Truncable";
import { capitalize } from "@/util/string";

import { getBuildURL, useBuildParams } from "../BuildParams";
import { BranchLink } from "../GitLink";
import {
  AutomationLibraryIcon,
  getAutomationLibraryLabel,
} from "../metadata/automationLibrary/AutomationLibraryIcon";
import { BrowserIcon } from "../metadata/browser/BrowserIcon";
import { getBrowserLabel } from "../metadata/browser/browserLabels";
import {
  colorSchemeIcons,
  getViewportIconKind,
  isColorScheme,
  viewportIcons,
} from "../metadata/metadataIcons";

const _BuildFragment = graphql(`
  fragment ContextSection_Build on Build {
    type
    storybook
    branch
    baseBranch
    baseBuild {
      id
      number
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

// Applied to each icon when several are stacked: a rounded badge with a ring
// the color of the surface behind it, so overlapping icons stay legible.
const STACKED_ICON_CLASSNAME =
  "bg-app size-4 shrink-0 rounded-full ring-[0.5px] ring-(--background-color-app)";

/** Icon component for a color scheme name (`light` / `dark`). */
function getColorSchemeIcon(colorScheme: string) {
  return isColorScheme(colorScheme)
    ? colorSchemeIcons[colorScheme]
    : SunMoonIcon;
}

/** Pick the singular or plural label depending on how many items there are. */
function pluralize(count: number, singular: string, plural: string) {
  return count > 1 ? plural : singular;
}

/**
 * The icon(s) in front of a row's value. A single value shows its icon; several
 * values show their icons stacked and overlapping, like the filter chips.
 */
function RowIcon(props: {
  count: number;
  render: (iconClassName: string) => React.ReactNode;
}) {
  const { count, render } = props;
  if (count > 1) {
    return <StackedItems>{render(STACKED_ICON_CLASSNAME)}</StackedItems>;
  }
  return render("size-4 shrink-0");
}

/**
 * One row of the definition list. All rows share the parent grid (via
 * `display: contents`), so the icon and value columns line up across every
 * row — including the icon-less ones (viewport, branch, baseline).
 */
function DefinitionRow(props: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="contents">
      <span className="text-low font-[450]">{props.label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        {props.icon ? (
          <span className="flex items-center">{props.icon}</span>
        ) : null}
        <Truncable className="text-default min-w-0 font-medium">
          {props.children}
        </Truncable>
      </div>
    </div>
  );
}

function CompareToField(props: {
  repoUrl: string | null;
  baseBranch?: string | null;
  baseBuild?: { number: number } | null;
  baseBuildUrl: string | null;
}) {
  const { repoUrl, baseBranch, baseBuild, baseBuildUrl } = props;

  if (!baseBranch && !baseBuild) {
    return <span className="text-low">No baseline yet</span>;
  }

  return (
    <>
      {baseBranch ? <BranchLink repoUrl={repoUrl} branch={baseBranch} /> : null}
      {baseBranch && baseBuild ? <span className="text-low"> · </span> : null}
      {baseBuild ? (
        baseBuildUrl ? (
          <Link href={baseBuildUrl}>#{baseBuild.number}</Link>
        ) : (
          <span className="text-low">#{baseBuild.number}</span>
        )
      ) : null}
    </>
  );
}

/**
 * Card of the build's technical context: framework, browser, viewports, color
 * schemes, and the branches it ran on and compared against.
 */
export function ContextSection(props: {
  build: Build;
  repoUrl: string | null;
}) {
  const { build, repoUrl } = props;
  const { branch, baseBranch, baseBuild, impactAnalysis: analysis } = build;
  const params = useBuildParams();
  const browsers = analysis?.buildBrowsers ?? [];
  const viewports = analysis?.buildViewports ?? [];
  const colorSchemes = analysis?.buildColorSchemes ?? [];
  const automationLibraries = analysis?.buildAutomationLibraries ?? [];
  const frameworks =
    automationLibraries.length > 0
      ? automationLibraries
      : build.storybook
        ? ["storybook"]
        : [];
  const baseBuildUrl =
    params && baseBuild
      ? getBuildURL({ ...params, buildNumber: baseBuild.number, diffId: null })
      : null;
  // A single viewport shows its width-specific icon; several fall back to the
  // generic viewport icon rather than stacking device icons.
  const ViewportIcon =
    viewports.length === 1
      ? viewportIcons[getViewportIconKind(parseInt(viewports[0]!, 10) || 0)]
      : MonitorSmartphoneIcon;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Context</PanelTitle>
      </PanelHeader>
      <div className="grid grid-cols-[7rem_1fr] items-center gap-x-3 gap-y-3.5 px-4 text-xs">
        {frameworks.length > 0 ? (
          <DefinitionRow
            label={pluralize(frameworks.length, "Framework", "Frameworks")}
            icon={
              <RowIcon
                count={frameworks.length}
                render={(className) =>
                  frameworks.map((name) => (
                    <AutomationLibraryIcon
                      key={name}
                      name={name}
                      className={clsx("text-low object-contain", className)}
                    />
                  ))
                }
              />
            }
          >
            {frameworks.map(getAutomationLibraryLabel).join(", ")}
          </DefinitionRow>
        ) : null}
        {browsers.length > 0 ? (
          <DefinitionRow
            label={pluralize(browsers.length, "Browser", "Browsers")}
            icon={
              <RowIcon
                count={browsers.length}
                render={(className) =>
                  browsers.map((name) => (
                    <BrowserIcon
                      key={name}
                      browser={{ name }}
                      className={clsx("object-contain", className)}
                    />
                  ))
                }
              />
            }
          >
            {browsers.map(getBrowserLabel).join(", ")}
          </DefinitionRow>
        ) : null}
        {viewports.length > 0 ? (
          <DefinitionRow
            label={pluralize(viewports.length, "Viewport", "Viewports")}
            icon={<ViewportIcon className="text-low size-4 shrink-0" />}
          >
            {viewports.join(", ")}
          </DefinitionRow>
        ) : null}
        {colorSchemes.length > 0 ? (
          <DefinitionRow
            label={pluralize(
              colorSchemes.length,
              "Color scheme",
              "Color schemes",
            )}
            icon={
              <RowIcon
                count={colorSchemes.length}
                render={(className) =>
                  colorSchemes.map((colorScheme) => {
                    const Icon = getColorSchemeIcon(colorScheme);
                    return (
                      <Icon
                        key={colorScheme}
                        className={clsx("text-low", className)}
                      />
                    );
                  })
                }
              />
            }
          >
            {colorSchemes.map(capitalize).join(", ")}
          </DefinitionRow>
        ) : null}
        {branch ? (
          <DefinitionRow label="Branch">
            <BranchLink repoUrl={repoUrl} branch={branch} />
          </DefinitionRow>
        ) : null}
        {build.type === BuildType.Orphan || baseBranch || baseBuild ? (
          <DefinitionRow label="Compared to">
            <CompareToField
              repoUrl={repoUrl}
              baseBranch={baseBranch}
              baseBuild={baseBuild}
              baseBuildUrl={baseBuildUrl}
            />
          </DefinitionRow>
        ) : null}
      </div>
    </Panel>
  );
}
