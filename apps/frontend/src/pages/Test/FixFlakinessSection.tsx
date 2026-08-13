import { useMemo } from "react";
import { PROMPT_AGENTS } from "@argos/agents";
import { AgentIcon } from "@argos/agents/react";
import { invariant } from "@argos/util/invariant";
import { SparklesIcon } from "lucide-react";

import { config } from "@/config";
import { AiPromptButton } from "@/containers/AiPromptButton";
import { isFlaky } from "@/containers/Test/Flakiness";
import { graphql, type DocumentType } from "@/gql";
import { MetricsPeriod } from "@/gql/graphql";
import { Details, Summary } from "@/ui/Details";
import { Panel, PanelTitle } from "@/ui/Panel";

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
          {/* Branding, not information: the menu below names every agent in
              text, so the marks stay out of the accessibility tree rather than
              repeating themselves. */}
          <span aria-hidden className="text-low/80 flex items-center gap-1.5">
            {PROMPT_AGENTS.map(({ id }) => (
              <AgentIcon key={id} id={id} className="size-4" />
            ))}
          </span>
        </Summary>
        <div className="flex flex-col gap-3 px-4">
          <p className="text-low text-sm">
            Hand this prompt to a coding agent working in your repository. It
            reads this test's stats and its recurring changes from the Argos
            API, then fixes what makes the screenshot unstable.
          </p>
          <AiPromptButton
            prompts={[{ label: "Fix flakiness", name: "prompt", prompt }]}
          />
        </div>
      </Details>
    </Panel>
  );
}
