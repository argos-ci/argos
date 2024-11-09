type SendEmailPayload = {
  to: string;
  subject: string;
  body: string;
};

export type SendEmailAction = {
  type: "send_email";
  payload: SendEmailPayload;
};
