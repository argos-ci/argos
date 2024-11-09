// import { useApolloClient } from "@apollo/client";
// import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
// import { useParams } from "react-router-dom";

import { DocumentType, graphql } from "@/gql";

// import {
//   Card,
//   CardBody,
//   CardFooter,
//   CardParagraph,
//   CardTitle,
// } from "@/ui/Card";
// import { Form } from "@/ui/Form";
// import { FormCardFooter } from "@/ui/FormCardFooter";

// import { BuildNotificationType } from "../../gql/graphql";
// import { Button } from "../../ui/Button";
// // Removed Disclosure components
// import { FormRadio, FormRadioGroup } from "../../ui/FormRadio";
// import { FormTextInput } from "../../ui/FormTextInput";
// import { Label } from "../../ui/Label";
// import { Link } from "../../ui/Link";

const _ProjectFragment = graphql(`
  fragment ProjectSlack_Project on Project {
    id
  }
`);

// const UpdateProjectSlackMutation = graphql(`
//   mutation ProjectSlackChannels_updateProject(
//     $id: ID!
//     $slackChannels: [CreateProjectAlertInput!]!
//   ) {
//     updateProject(input: { id: $id, slackChannels: $slackChannels }) {
//       id
//       slackChannels {
//         id
//         externalChannelId
//         name
//         buildNotificationType
//       }
//     }
//   }
// `);

// type Inputs = {
//   slackChannels: CreateProjectAlertInput[];
// };

// const emptySlackChannel: CreateProjectAlertInput = {
//   externalChannelId: "",
//   name: "",
//   buildNotificationType: BuildNotificationType.WithChanges,
// };

export const ProjectSlack = (props: {
  project: DocumentType<typeof _ProjectFragment>;
  slackWorkspace: string | undefined;
}) => {
  console.log({
    project: props.project,
    slackWorkspace: props.slackWorkspace,
  });
  return "hey";
  // const sectionTitle = "Slack Notifications";

  // const { accountSlug } = useParams();
  // const { project } = props;

  // const client = useApolloClient();

  // const form = useForm<Inputs>({
  //   defaultValues: {
  //     slackChannels: project.slackChannels.map((slackChannel) => ({
  //       externalChannelId: slackChannel.externalChannelId,
  //       name: slackChannel.name,
  //       buildNotificationType: slackChannel.buildNotificationType,
  //     })),
  //   },
  // });
  // const onSubmit: SubmitHandler<Inputs> = async (data) => {
  //   await client.mutate({
  //     mutation: UpdateProjectSlackMutation,
  //     variables: {
  //       id: project.id,
  //       slackChannels: data.slackChannels,
  //     },
  //   });
  // };

  // const slackChannels = form.watch("slackChannels");

  // return (
  //   <Card>
  //     {props.slackWorkspace ? (
  //       <FormProvider {...form}>
  //         <Form onSubmit={onSubmit}>
  //           <CardBody>
  //             <CardTitle>{sectionTitle}</CardTitle>

  //             <CardParagraph>
  //               Your team is connected to the{" "}
  //               <span className="font-semibold">{props.slackWorkspace}</span>{" "}
  //               Slack workspace. You can update the connection in your{" "}
  //               <Link href={`/${accountSlug}/settings#slack-integration`}>
  //                 team settings
  //               </Link>
  //               .
  //             </CardParagraph>

  //             <CardParagraph className="text-sm">
  //               <span className="font-semibold">Note:</span> To send
  //               notifications to a{" "}
  //               <span className="font-semibold">private</span> Slack channel,
  //               make sure the <span className="font-semibold">Argos bot</span>{" "}
  //               is invited.
  //             </CardParagraph>

  //             {slackChannels.map((_, index) => (
  //               <div
  //                 key={index}
  //                 className="mt-4 flex flex-col gap-4 rounded-sm border p-4"
  //               >
  //                 <div className="flex items-center justify-between">
  //                   <h3 className="font-medium">
  //                     Channel {index + 1}:{" "}
  //                     <span className="text-muted-foreground">
  //                       {slackChannels[index]?.name || "New"}
  //                     </span>
  //                   </h3>
  //                   <Button
  //                     variant="secondary"
  //                     size="small"
  //                     className="text-red-600 hover:underline"
  //                     onClick={() => {
  //                       form.setValue(
  //                         "slackChannels",
  //                         slackChannels.filter((_, i) => i !== index),
  //                       );
  //                     }}
  //                   >
  //                     Remove
  //                   </Button>
  //                 </div>

  //                 <div className="grid gap-4 md:grid-cols-2">
  //                   <FormTextInput
  //                     {...form.register(
  //                       `slackChannels.${index}.externalChannelId`,
  //                       { required: "Slack channel name is required" },
  //                     )}
  //                     label="Slack channel ID"
  //                     placeholder="e.g., D052T9J702K"
  //                   />
  //                   <FormTextInput
  //                     {...form.register(`slackChannels.${index}.name`)}
  //                     label="Slack channel name (optional)"
  //                     placeholder="e.g., #build-notifs"
  //                   />
  //                 </div>

  //                 <div className="flex flex-col gap-2">
  //                   <Label>Notification type</Label>
  //                   <FormRadioGroup>
  //                     <FormRadio
  //                       {...form.register(
  //                         `slackChannels.${index}.buildNotificationType`,
  //                       )}
  //                       value={BuildNotificationType.WithChanges}
  //                       label="Notify only when visual changes are detected"
  //                     />

  //                     <FormRadio
  //                       {...form.register(
  //                         `slackChannels.${index}.buildNotificationType`,
  //                       )}
  //                       value={BuildNotificationType.ReferenceChanges}
  //                       label="Notify only for reference builds"
  //                     />

  //                     <FormRadio
  //                       {...form.register(
  //                         `slackChannels.${index}.buildNotificationType`,
  //                       )}
  //                       value={BuildNotificationType.AllChanges}
  //                       label="Notify for every build"
  //                     />
  //                   </FormRadioGroup>
  //                 </div>
  //               </div>
  //             ))}

  //             <Button
  //               variant="secondary"
  //               className="mt-2"
  //               onClick={() => {
  //                 form.setValue("slackChannels", [
  //                   ...slackChannels,
  //                   emptySlackChannel,
  //                 ]);
  //               }}
  //             >
  //               + Add a Slack channel
  //             </Button>
  //           </CardBody>

  //           <FormCardFooter />
  //         </Form>
  //       </FormProvider>
  //     ) : (
  //       <>
  //         <CardBody>
  //           <CardTitle>{sectionTitle}</CardTitle>
  //           <CardParagraph>
  //             Enable Slack notifications to let Argos post updates to your Slack
  //             workspace.
  //           </CardParagraph>
  //         </CardBody>
  //         <CardFooter>
  //           Connect your Slack workspace to{" "}
  //           <Link href={`/${accountSlug}/settings#slack-integration`}>
  //             your team
  //           </Link>{" "}
  //           before enabling notifications.
  //         </CardFooter>
  //       </>
  //     )}
  //   </Card>
  // );
};
