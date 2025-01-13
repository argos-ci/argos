import type * as React from "react";

import {
  NotificationWorkflowData,
  NotificationWorkflowType,
} from "../workflow-types";
import * as spend_limit from "./spend_limit";
import * as welcome from "./welcome";

export type HandlerContext = {
  user: {
    name: string | null;
  };
};

export type Handler<Type extends NotificationWorkflowType> = {
  previewData: NotificationWorkflowData[Type];
  email: (props: NotificationWorkflowData[Type] & { ctx: HandlerContext }) => {
    subject: string;
    body: React.JSX.Element;
  };
};

export const handlers = {
  welcome,
  spend_limit,
} satisfies {
  [K in NotificationWorkflowType]: Handler<K>;
};
