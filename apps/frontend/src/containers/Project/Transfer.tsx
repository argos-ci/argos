import { useState } from "react";
import { useApolloClient } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { ArrowRightCircleIcon, CheckCircle2Icon } from "lucide-react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Modal } from "@/ui/Modal";

import { AccountAvatar } from "../AccountAvatar";
import { AccountSelector } from "../AccountSelector";
import { useQuery } from "../Apollo";

type TransferDialogButtonProps = {
  project: FragmentType<typeof ProjectFragment>;
};

type SelectAccountStepProps = {
  actualAccountId: string;
  targetAccountId: string;
  setTargetAccountId: (value: string) => void;
  onContinue: () => void;
};

const MeQuery = graphql(`
  query TransferProject_me {
    me {
      id
      ...AccountItem_Account
      teams {
        id
        ...AccountItem_Account
      }
    }
  }
`);

const SelectAccountStep = (props: SelectAccountStepProps) => {
  const { data } = useQuery(MeQuery);

  return (
    <>
      <DialogBody>
        <DialogTitle>Transfer Project</DialogTitle>
        <DialogText>
          Select a Argos Account to transfer your Project to.
        </DialogText>

        <DialogText>
          <strong>
            Your Project and all of its dependencies (such as builds and
            screenshots) will be transferred.
          </strong>
        </DialogText>

        <DialogText>
          Prior to the transfer, you will be presented with the included
          dependencies, and how potential conflicts or plan changes will be
          resolved.
        </DialogText>

        <AccountSelector
          value={props.targetAccountId}
          setValue={props.setTargetAccountId}
          accounts={data && data.me ? [data.me, ...data.me.teams] : []}
          disabledAccountIds={[props.actualAccountId]}
        />
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          onPress={() => {
            props.onContinue();
          }}
          isDisabled={!props.targetAccountId}
        >
          Continue
        </Button>
      </DialogFooter>
    </>
  );
};

const AccountFragment = graphql(`
  fragment ProjectTransfer_Account on Account {
    id
    name
    slug
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

const ReviewQuery = graphql(`
  query ProjectTransfer_Review(
    $projectId: ID!
    $actualAccountId: ID!
    $targetAccountId: ID!
  ) {
    projectById(id: $projectId) {
      id
      builds {
        pageInfo {
          totalCount
        }
      }
      totalScreenshots
    }

    actualAccount: accountById(id: $actualAccountId) {
      id
      ...ProjectTransfer_Account
      plan {
        id
        displayName
      }
    }

    targetAccount: accountById(id: $targetAccountId) {
      id
      ...ProjectTransfer_Account
      plan {
        id
        displayName
      }
    }
  }
`);

const TransferProjectMutation = graphql(`
  mutation ProjectTransfer_TransferProject(
    $projectId: ID!
    $targetAccountId: ID!
    $name: String!
  ) {
    transferProject(
      input: { id: $projectId, targetAccountId: $targetAccountId, name: $name }
    ) {
      id
      name
      account {
        id
        name
        slug
      }
    }
  }
`);

type ReviewStepProps = {
  projectId: string;
  projectName: string;
  actualAccountId: string;
  targetAccountId: string;
  onBack: () => void;
  onContinue: () => void;
};

type ReviewInputs = {
  name: string;
};

const ReviewStep = (props: ReviewStepProps) => {
  const { data } = useQuery(ReviewQuery, {
    variables: {
      projectId: props.projectId,
      actualAccountId: props.actualAccountId,
      targetAccountId: props.targetAccountId,
    },
  });
  const client = useApolloClient();
  const readAccountFromCache = (id: string) => {
    return client.readFragment({
      fragment: AccountFragment,
      fragmentName: "ProjectTransfer_Account",
      id: client.cache.identify({
        __typename: "Account",
        id,
      }),
    });
  };
  const actualAccount = readAccountFromCache(props.actualAccountId);
  const targetAccount = readAccountFromCache(props.targetAccountId);
  invariant(actualAccount && targetAccount, "cannot read accounts from cache");
  const form = useForm<ReviewInputs>({
    defaultValues: {
      name: props.projectName,
    },
  });
  const onSubmit: SubmitHandler<ReviewInputs> = async (data) => {
    await client.mutate({
      mutation: TransferProjectMutation,
      variables: {
        projectId: props.projectId,
        targetAccountId: props.targetAccountId,
        name: data.name,
      },
    });
    props.onContinue();
  };
  return (
    <>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <DialogBody>
            <DialogTitle>Transfer Project</DialogTitle>
            <div className="my-10 flex justify-around gap-10 text-center">
              <div className="flex flex-1 flex-col items-center">
                <AccountAvatar avatar={actualAccount.avatar} size={64} />
                <div className="mt-2 text-xl">
                  {actualAccount.name || actualAccount.slug}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRightCircleIcon
                  className="text-low"
                  style={{ width: 64, height: 64 }}
                />
              </div>
              <div className="flex flex-1 flex-col items-center">
                <AccountAvatar avatar={targetAccount.avatar} size={64} />
                <div className="mt-2 text-xl">
                  {targetAccount.name || targetAccount.slug}
                </div>
              </div>
            </div>
            <div className="my-8">
              <FormTextInput
                {...form.register("name", {
                  required: "Project name is required",
                })}
                label="New Project name"
              />
            </div>
            {(() => {
              if (!data) {
                return <DialogText>Loading...</DialogText>;
              }
              const project = data.projectById;
              invariant(
                project && data.actualAccount && data.targetAccount,
                "data not found",
              );
              const buildCount = project.builds.pageInfo.totalCount;
              const screenshotCount = project.totalScreenshots;
              const samePlan =
                data.actualAccount.plan?.id === data.targetAccount.plan?.id;
              return (
                <>
                  <DialogText>
                    The following elements will be transfered:
                  </DialogText>
                  <ul className="list-disc pl-4">
                    {buildCount > 0 ? (
                      <li>
                        {buildCount} build{buildCount > 1 && "s"}
                      </li>
                    ) : (
                      <li>No build</li>
                    )}
                    {screenshotCount > 0 ? (
                      <li>
                        {screenshotCount} screenshot{screenshotCount > 1 && "s"}
                      </li>
                    ) : (
                      <li>No screenshots</li>
                    )}
                  </ul>
                  {samePlan ? (
                    <DialogText>
                      <strong>
                        Both accounts are on the same plan
                        {data.actualAccount.plan
                          ? ` (${data.actualAccount.plan.displayName})`
                          : ""}
                        .
                      </strong>{" "}
                      The project will be transfered without any change to the
                      plan.
                    </DialogText>
                  ) : (
                    <DialogText>
                      The project is actually on the plan{" "}
                      {data.actualAccount.plan?.displayName ?? `"no plan"`}. The
                      project will be transfered to the target account and the
                      plan will be changed to{" "}
                      {data.targetAccount.plan?.displayName ?? `"no plan"`}.
                    </DialogText>
                  )}
                </>
              );
            })()}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onPress={props.onBack}>
              Back
            </Button>
            <FormSubmit>Transfer</FormSubmit>
          </DialogFooter>
        </Form>
      </FormProvider>
    </>
  );
};

type SuccessStepProps = {
  accountName: string;
  onContinue: () => void;
};

const SuccessStep = (props: SuccessStepProps) => {
  return (
    <>
      <DialogBody>
        <DialogTitle>Transfer Project</DialogTitle>
        <div className="my-8 flex justify-center">
          <CheckCircle2Icon
            className="text-success-500"
            style={{ width: 80, height: 80 }}
          />
        </div>
        <DialogText className="text-center text-lg">
          Project transfered successfully.
          <br />
          You can now access the project from{" "}
          <strong>{props.accountName}</strong>.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss
          single
          onPress={() => {
            props.onContinue();
          }}
        >
          OK
        </DialogDismiss>
      </DialogFooter>
    </>
  );
};

const TransferDialogButton = (props: TransferDialogButtonProps) => {
  const project = useFragment(ProjectFragment, props.project);
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [step, setStep] = useState<"select" | "review" | "success">("select");
  const navigate = useNavigate();
  return (
    <DialogTrigger>
      <Button>Transfer</Button>
      <Modal>
        <Dialog size="medium">
          {(() => {
            switch (step) {
              case "select":
                return (
                  <SelectAccountStep
                    actualAccountId={project.account.id}
                    targetAccountId={targetAccountId}
                    setTargetAccountId={setTargetAccountId}
                    onContinue={() => {
                      setStep("review");
                    }}
                  />
                );
              case "review":
                return (
                  <ReviewStep
                    actualAccountId={project.account.id}
                    targetAccountId={targetAccountId}
                    projectId={project.id}
                    projectName={project.name}
                    onBack={() => setStep("select")}
                    onContinue={() => {
                      setStep("success");
                    }}
                  />
                );
              case "success":
                return (
                  <SuccessStep
                    accountName={project.account.name || project.account.slug}
                    onContinue={() => {
                      navigate(`/${project.slug}/settings`, {
                        replace: true,
                      });
                    }}
                  />
                );
            }
          })()}
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
};

const ProjectFragment = graphql(`
  fragment ProjectTransfer_Project on Project {
    id
    name
    slug
    account {
      id
      name
      slug
    }
  }
`);

export const ProjectTransfer = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  return (
    <Card>
      <CardBody>
        <CardTitle>Transfer Project</CardTitle>
        <CardParagraph>
          Transfer your project to another team or account.
        </CardParagraph>
      </CardBody>
      <CardFooter className="flex items-center justify-end">
        <TransferDialogButton project={props.project} />
      </CardFooter>
    </Card>
  );
};
