import { z } from 'zod';
import { ActionContext, registerAction } from '../actionRegistry';
import { patchAutomationActionRun } from '../services/patchAutomationActionRun'; // Assuming this service exists

export const SendEmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

async function process(
  payload: z.infer<typeof SendEmailPayloadSchema>,
  context: ActionContext
): Promise<void> {
  const { automationActionRun } = context;
  console.log(
    `Simulating sending email to "${payload.to}" with subject "${payload.subject}" for action run ${automationActionRun.id}`
  );
  console.log(`Email body: ${payload.body}`);

  // Simulate success
  await patchAutomationActionRun({
    automationActionRunId: automationActionRun.id,
    data: {
      jobStatus: 'complete',
      conclusion: 'success',
      output: {
        summary: `Email action simulated for ${payload.to}`,
      },
    },
  });
}

registerAction({
  type: 'send_email',
  payloadSchema: SendEmailPayloadSchema,
  process,
});
