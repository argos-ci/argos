import { assertNever } from "@argos/util/assertNever";

import { TestStatus } from "@/gql/graphql";
import { Tooltip } from "@/ui/Tooltip";

export function TestStatusIndicator(props: { status: TestStatus }) {
  const { status } = props;
  switch (status) {
    case TestStatus.Ongoing:
      return (
        <Tooltip content="This test is part of the active tests list.">
          <span>Ongoing</span>
        </Tooltip>
      );
    case TestStatus.Removed:
      return (
        <Tooltip content="This test has been removed from the active tests list.">
          <span>Removed</span>
        </Tooltip>
      );
    default:
      assertNever(status, "Unknown test status");
  }
}
