import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { AccountSubscriptionProvider, PlanInterval } from "@/gql/graphql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";

const _TeamFragment = graphql(`
  fragment TeamMonthlyReport_Team on Team {
    id
    hasForcedPlan
    plan {
      id
      interval
      usageBased
    }
    subscription {
      id
      provider
    }
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
  // The report only goes to the teams on an annual usage-based Stripe plan.
  if (
    team.hasForcedPlan ||
    team.plan?.interval !== PlanInterval.Year ||
    !team.plan.usageBased ||
    team.subscription?.provider !== AccountSubscriptionProvider.Stripe
  ) {
    return null;
  }
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
          <FormSwitch
            control={form.control}
            name="receivesMonthlyReport"
            label="Email me the monthly report"
          />
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
}
