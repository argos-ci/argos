import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Switch } from "@/ui/Switch";
import { getErrorMessage } from "@/util/error";

const _AccountFragment = graphql(`
  fragment UserNotificationPreferences_Account on User {
    id
    notificationPreferences {
      id
      category
      channel
      enabled
      label
      description
    }
  }
`);

const UpdateNotificationPreferenceMutation = graphql(`
  mutation UserNotificationPreferences_updateNotificationPreference(
    $input: UpdateNotificationPreferenceInput!
  ) {
    updateNotificationPreference(input: $input) {
      id
      enabled
    }
  }
`);

export function UserNotificationPreferences(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  invariant(account.__typename === "User");
  const client = useApolloClient();
  return (
    <Card>
      <CardBody>
        <CardTitle id="notifications">Notifications</CardTitle>
        <CardParagraph>
          Choose which email notifications you want to receive. Account and
          security notifications are always sent.
        </CardParagraph>
        <div className="flex flex-col gap-4">
          {account.notificationPreferences.map((preference) => (
            <div
              key={preference.id}
              className="flex items-center justify-between gap-6"
            >
              <div>
                <div className="text-sm font-medium">{preference.label}</div>
                <p className="text-low text-sm">{preference.description}</p>
              </div>
              <Switch
                aria-label={preference.label}
                isSelected={preference.enabled}
                onChange={(enabled) => {
                  client
                    .mutate({
                      mutation: UpdateNotificationPreferenceMutation,
                      variables: {
                        input: {
                          category: preference.category,
                          channel: preference.channel,
                          enabled,
                        },
                      },
                      optimisticResponse: {
                        updateNotificationPreference: {
                          __typename: "NotificationPreference",
                          id: preference.id,
                          enabled,
                        },
                      },
                    })
                    .then(() => {
                      toast.success("Notification preferences updated.");
                    })
                    .catch((error) => {
                      toast.error(getErrorMessage(error));
                    });
                }}
              />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
