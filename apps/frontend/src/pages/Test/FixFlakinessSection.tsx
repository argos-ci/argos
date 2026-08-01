import { useMemo } from "react";
import { invariant } from "@argos/util/invariant";
import { useAtom } from "jotai";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  SparklesIcon,
} from "lucide-react";
import { useClipboard } from "use-clipboard-copy";

import { config } from "@/config";
import { isFlaky } from "@/containers/Test/Flakiness";
import { graphql, type DocumentType } from "@/gql";
import { MetricsPeriod } from "@/gql/graphql";
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Details, Summary } from "@/ui/Details";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Panel, PanelTitle } from "@/ui/Panel";
import { Popover } from "@/ui/Popover";
import { Tooltip } from "@/ui/Tooltip";
import { AI_AGENTS, aiAgentIdAtom, getAiAgent } from "@/util/ai-agents";

import { getTestURL, useTestParams } from "./TestParams";

const _TestFragment = graphql(`
  fragment FixFlakinessSection_Test on Test {
    id
    name
    buildName
    metrics(period: $period) {
      all {
        total
        changes
        uniqueChanges
        flakiness
      }
    }
  }
`);

type Test = DocumentType<typeof _TestFragment>;

/**
 * A prompt to hand to a coding agent so it fixes this test's flakiness on its
 * own. It carries the numbers Argos measured, the two API calls that expose the
 * test and the changes that keep coming back, and what to look for once the
 * agent has the diff images.
 */
function buildPrompt(input: {
  test: Test;
  accountSlug: string;
  projectName: string;
  period: MetricsPeriod;
  periodLabel: string;
  testUrl: string;
}): string {
  const { test, accountSlug, projectName, period, periodLabel, testUrl } =
    input;
  const metrics = test.metrics.all;
  const apiBaseUrl = `${config.api.baseUrl}/v2`;
  const testApiUrl = `${apiBaseUrl}/projects/${accountSlug}/${projectName}/tests/${test.id}`;
  const flakinessPercent = Math.round(metrics.flakiness * 100);

  return `Fix the flaky Argos visual test "${test.name}" in the ${accountSlug}/${projectName} project.

A visual test is flaky when it keeps capturing a different screenshot while nothing in the UI actually changed. What Argos measured over the ${periodLabel} — builds that ran it: ${metrics.total}, changes: ${metrics.changes}, changes seen only once: ${metrics.uniqueChanges}, flakiness score: ${flakinessPercent}%.

- Test id: ${test.id}
- Build name: ${test.buildName}
- Test page: ${testUrl}

1. Read the test and the changes that keep coming back. Use whichever of these you have, in this order:
   - The Argos CLI, if it is installed: \`npx @argos-ci/cli test get ${test.id} --json\` and \`npx @argos-ci/cli test changes ${test.id} --json\`, with \`--project ${accountSlug}/${projectName}\` unless \`ARGOS_TOKEN\` is a project token.
   - The Argos MCP server, if it is connected: the \`getTest\` and \`listTestChanges\` tools.
   - The REST API otherwise, with \`Authorization: Bearer $ARGOS_TOKEN\` (an Argos personal access token):
     GET ${testApiUrl}?metricsPeriod=${period}
     GET ${testApiUrl}/changes?metricsPeriod=${period}
2. For the changes with the highest \`occurrences\`, open \`diff.url\`, \`diff.base.url\` and \`diff.head.url\` and look at what actually moves between the baseline and the capture.
3. Find that test in this repository from its name and its build name, then work out what makes the screenshot non-deterministic: animations or transitions still running, dates and times, random or unordered data, fonts or images not loaded yet, network timing, scrollbars, carets, third-party embeds.
4. Fix the root cause so the capture is stable — wait for the real end state instead of a fixed delay, freeze the clock and the random source, order the data. Prefer making the UI deterministic over masking the region.
5. If a change turns out to be noise that genuinely cannot be made deterministic, ignore it in Argos instead, with its \`id\` from step 1 — \`npx @argos-ci/cli change ignore <changeId> --project ${accountSlug}/${projectName}\`, or:
   POST ${apiBaseUrl}/projects/${accountSlug}/${projectName}/changes/<changeId>/ignore
6. Report what was non-deterministic, what you changed, and why the screenshot is stable now.`;
}

/**
 * A prompt to hand to a coding agent so it investigates and fixes this test's
 * flakiness from the API, without anyone having to describe the test to it.
 * Either the agent opens with the prompt already typed in, or the prompt goes to
 * the clipboard for an agent Argos does not know how to open.
 *
 * The section is a disclosure that only opens itself when the test actually
 * looks flaky. On a stable test there is nothing to fix, so it stays folded into
 * its header — one line the user can still open — instead of taking up the
 * sidebar next to the numbers that say the test is fine.
 */
export function FixFlakinessSection(props: {
  test: Test;
  period: MetricsPeriod;
  periodLabel: string;
}) {
  const { test, period, periodLabel } = props;
  const params = useTestParams();
  invariant(params, "Can't be used outside of a test route");
  const clipboard = useClipboard({ copiedTimeout: 2000 });
  const [agentId, setAgentId] = useAtom(aiAgentIdAtom);
  const agent = getAiAgent(agentId);
  const flaky = isFlaky(test.metrics.all.flakiness);

  const prompt = useMemo(
    () =>
      buildPrompt({
        test,
        accountSlug: params.accountSlug,
        projectName: params.projectName,
        period,
        periodLabel,
        testUrl: new URL(
          getTestURL({ ...params, testId: test.id }),
          config.server.url,
        ).href,
      }),
    [test, params, period, periodLabel],
  );

  return (
    <Panel>
      {/* `open` seeds the initial state only: from there `Summary` toggles the
          attribute on the element itself. */}
      <Details open={flaky}>
        <Summary className="mx-3" icon={SparklesIcon}>
          <PanelTitle className="flex-1">Fix with AI</PanelTitle>
          {/* Each logo names itself through the `<title>` in its own SVG, and
              takes the color it is given. */}
          <span className="text-low flex items-center gap-1.5">
            {AI_AGENTS.map(({ id, Icon }) => (
              <Icon key={id} className="size-4" />
            ))}
          </span>
        </Summary>
        <div className="flex flex-col gap-3 px-4">
          <p className="text-low text-sm">
            Hand this prompt to a coding agent working in your repository. It
            reads this test's stats and its recurring changes from the Argos
            API, then fixes what makes the screenshot unstable.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {/* A split button: the last agent picked, and a menu for the others.
                Both halves are links to the agent's own deep link, so the prompt
                is filled in on the machine and never sent on its own. */}
            <ButtonGroup>
              <LinkButton variant="secondary" href={agent.getURL(prompt)}>
                <ButtonIcon>
                  <agent.Icon />
                </ButtonIcon>
                Open in {agent.name}
              </LinkButton>
              <MenuTrigger>
                <Button
                  variant="secondary"
                  iconOnly
                  aria-label="Open in another agent"
                >
                  <ChevronDownIcon />
                </Button>
                <Popover>
                  <Menu aria-label="Agents">
                    {AI_AGENTS.map(({ id, name, Icon, getURL }) => (
                      <MenuItem
                        key={id}
                        href={getURL(prompt)}
                        textValue={name}
                        onAction={() => setAgentId(id)}
                      >
                        <MenuItemIcon>
                          <Icon />
                        </MenuItemIcon>
                        Open in {name}
                      </MenuItem>
                    ))}
                  </Menu>
                </Popover>
              </MenuTrigger>
            </ButtonGroup>
            {/* Icon-only so the row still fits the sidebar next to the agent
                button, and kept for the agents Argos cannot open by itself. */}
            <Tooltip content={clipboard.copied ? "Copied" : "Copy prompt"}>
              <Button
                variant="secondary"
                iconOnly
                aria-label={clipboard.copied ? "Copied" : "Copy prompt"}
                onPress={() => clipboard.copy(prompt)}
              >
                {clipboard.copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </Tooltip>
          </div>
        </div>
      </Details>
    </Panel>
  );
}
