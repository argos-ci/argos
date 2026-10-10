import { useId } from "react";
import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { SwitchField } from "@/ui/Switch";

const _TeamFragment = graphql(`
  fragment TeamMonthlyReport_Team on Team {
    id
    me {
      id
      receivesMonthlyReport
    }
  }
`);

const SetMonthlyReportSubscriptionMutation = graphql(`
  mutation TeamMonthlyReport_setMonthlyReportSubscription(
    $input: SetMonthlyReportSubscriptionInput!
  ) {
    setMonthlyReportSubscription(input: $input) {
      id
      receivesMonthlyReport
    }
  }
`);

type Inputs = {
  receivesMonthlyReport: boolean;
};

export function TeamMonthlyReport(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  // Staff can administer a team they are not a member of, and the setting
  // belongs to a membership.
  if (!team.me) {
    return null;
  }
  return (
    <MonthlyReportForm
      teamAccountId={team.id}
      receivesMonthlyReport={team.me.receivesMonthlyReport}
    />
  );
}

function MonthlyReportForm(props: {
  teamAccountId: string;
  receivesMonthlyReport: boolean;
}) {
  const client = useApolloClient();
  const switchId = useId();
  const form = useForm<Inputs>({
    defaultValues: { receivesMonthlyReport: props.receivesMonthlyReport },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: SetMonthlyReportSubscriptionMutation,
      variables: {
        input: {
          teamAccountId: props.teamAccountId,
          subscribed: data.receivesMonthlyReport,
        },
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle id="monthly-report">Monthly report</CardTitle>
          <CardParagraph>
            Get a monthly email with your team's activity and how much of its
            plan it uses. This setting only applies to you.
          </CardParagraph>
          <div className="flex items-center justify-between gap-4 rounded-sm border p-4">
            <label htmlFor={switchId} className="font-medium">
              Email me the monthly report
            </label>
            <SwitchField
              id={switchId}
              control={form.control}
              name="receivesMonthlyReport"
            />
          </div>
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
}
