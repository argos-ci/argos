import { config } from "@/config";
import type { MetricsPeriod } from "@/gql/graphql";

/**
 * What the prompt needs to know about the test. Taken apart rather than typed
 * on a fragment: the test page and a build's sidebar select their metrics under
 * different names, over different periods.
 */
export interface FlakinessPromptTest {
  id: string;
  name: string;
  buildName: string;
  metrics: {
    total: number;
    changes: number;
    uniqueChanges: number;
    flakiness: number;
  };
}

/**
 * A prompt to hand to a coding agent so it fixes this test's flakiness on its
 * own. It carries the numbers Argos measured, the two API calls that expose the
 * test and the changes that keep coming back, and what to look for once the
 * agent has the diff images.
 */
export function createFixFlakinessPrompt(input: {
  test: FlakinessPromptTest;
  accountSlug: string;
  projectName: string;
  period: MetricsPeriod;
  periodLabel: string;
  testUrl: string;
}): string {
  const { test, accountSlug, projectName, period, periodLabel, testUrl } =
    input;
  const metrics = test.metrics;
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
