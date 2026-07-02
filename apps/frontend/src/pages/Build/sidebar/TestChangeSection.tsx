import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { CircleCheckIcon, FlagOffIcon, WavesIcon } from "lucide-react";
import { useNumberFormatter } from "react-aria";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { graphql, type DocumentType } from "@/gql";
import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { getUserCardData, UserHoverCard } from "@/ui/UserCard";

import { useProjectParams } from "../../Project/ProjectParams";
import { getTestURL } from "../../Test/TestParams";
import { InsightTitle } from "./InsightTitle";

const _TestFragment = graphql(`
  fragment TestChangeSection_Test on Test {
    id
    last7daysMetrics: metrics(period: LAST_7_DAYS) {
      all {
        total
      }
    }
  }
`);

const _TestChangeFragment = graphql(`
  fragment TestChangeSection_TestChange on TestChange {
    id
    ignored
    trails {
      ...Test_AuditTrail
    }
  }
`);

export function TestChangeSection(props: {
  test: DocumentType<typeof _TestFragment>;
  change: DocumentType<typeof _TestChangeFragment>;
  occurrences: number;
}) {
  const { test, change, occurrences } = props;
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");
  const lastTrail = change.trails.at(-1) ?? null;
  const lastIgnoredTrail =
    lastTrail?.action === "files.ignored" ? lastTrail : null;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Change</PanelTitle>
        <HeadlessLink
          className="hover:text-default text-low flex items-center text-xs"
          href={getTestURL(
            { ...params, testId: test.id },
            { change: change.id },
          )}
        >
          See details
        </HeadlessLink>
      </PanelHeader>
      <div className="shrink-0 px-4">
        <InsightTitle
          className="mb-2"
          title="Occurrences"
          tooltip={
            <>
              The number of auto-approved builds that have shown exactly the
              same change in the last 7 days.
            </>
          }
        />
        <div
          className={clsx(
            "text-xl font-bold",
            occurrences > 1 ? "text-danger-low" : "text-success-low",
          )}
        >
          {compactFormatter.format(occurrences)} /{" "}
          {compactFormatter.format(test.last7daysMetrics.all.total)}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 px-4 text-xs">
        {occurrences > 1 ? (
          change.ignored ? (
            <>
              <FlagOffIcon className="text-low size-3" />
              Change ignored{" "}
              {lastIgnoredTrail ? (
                <>
                  by{" "}
                  <UserHoverCard user={getUserCardData(lastIgnoredTrail.user)}>
                    <span
                      tabIndex={0}
                      className="inline-flex items-center gap-1.5"
                    >
                      <AccountAvatar
                        avatar={lastIgnoredTrail.user.avatar}
                        className="size-3.5 border"
                      />
                      {lastIgnoredTrail.user.name || lastIgnoredTrail.user.slug}
                    </span>
                  </UserHoverCard>
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              <WavesIcon className="text-danger-low size-3" />
              This change is flaky, safe to be ignored.
            </>
          )
        ) : occurrences === 1 ? (
          <>
            <CircleCheckIcon className="text-success-low size-3" />
            Seen once in the last seven days.
          </>
        ) : (
          <>
            <CircleCheckIcon className="text-success-low size-3" />
            Not seen in the last seven days.
          </>
        )}
      </div>
    </Panel>
  );
}
