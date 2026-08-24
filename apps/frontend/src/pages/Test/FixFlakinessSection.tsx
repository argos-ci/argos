import { useMemo } from "react";
import { invariant } from "@argos/util/invariant";
import { SparklesIcon } from "lucide-react";

import { config } from "@/config";
import { AiPromptButton } from "@/containers/AiPromptButton";
import { createFixFlakinessPrompt } from "@/containers/Test/FixFlakinessPrompt";
import { isFlaky } from "@/containers/Test/Flakiness";
import { graphql, type DocumentType } from "@/gql";
import { MetricsPeriod } from "@/gql/graphql";
import { Details, Summary } from "@/ui/Details";
import { Panel, PanelTitle } from "@/ui/Panel";
import { AI_AGENTS } from "@/util/ai-agents";

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
      createFixFlakinessPrompt({
        test: { ...test, metrics: test.metrics.all },
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
          <AiPromptButton
            prompts={[{ label: "Fix flakiness", name: "prompt", prompt }]}
          />
        </div>
      </Details>
    </Panel>
  );
}
