import { SeenChange } from "@/containers/Test/SeenChange";
import { graphql, type DocumentType } from "@/gql";
import { Panel } from "@/ui/Panel";

import type { ProjectParams } from "../Project/ProjectParams";

const _TestFragment = graphql(`
  fragment ChangeHistorySection_Test on Test {
    id
    firstSeenDiff {
      ...ScreenChange_ScreenshotDiff
    }
    lastSeenDiff {
      ...ScreenChange_ScreenshotDiff
    }
  }
`);

/**
 * When this test first and last changed, each linking to the build the change
 * showed up in.
 */
export function ChangeHistorySection(props: {
  test: DocumentType<typeof _TestFragment>;
  params: ProjectParams;
}) {
  const { test, params } = props;
  return (
    <Panel>
      <div className="flex flex-col gap-3 px-4">
        <SeenChange
          title="First change"
          params={params}
          diff={test.firstSeenDiff ?? null}
        />
        <SeenChange
          title="Last change"
          params={params}
          diff={test.lastSeenDiff ?? null}
        />
      </div>
    </Panel>
  );
}
