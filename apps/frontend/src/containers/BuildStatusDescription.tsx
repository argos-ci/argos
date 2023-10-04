import { FragmentType, graphql, useFragment } from "@/gql";
import { Code } from "@/ui/Code";

import { checkIsBuildEmpty, checkIsBuildIncomplete } from "./Build";

export const BuildFragment = graphql(`
  fragment BuildStatusDescription_Build on Build {
    type
    status
    batchCount
    totalBatch
    stats {
      total
    }
  }
`);

export const ProjectFragment = graphql(`
  fragment BuildStatusDescription_Project on Project {
    referenceBranch
  }
`);

export const BuildStatusDescription = (props: {
  build: FragmentType<typeof BuildFragment>;
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const build = useFragment(BuildFragment, props.build);
  const project = useFragment(ProjectFragment, props.project);

  if (build.status === "expired") {
    if (checkIsBuildIncomplete(build)) {
      return (
        <>
          Build has been killed because it took too much time to receive all
          batches.
          <br />
          Be sure that argos upload is called up to the number specified in
          parallel total.
        </>
      );
    }
    return <>Build has been killed because it took too much time.</>;
  }

  switch (build.type) {
    case "orphan":
      return (
        <>
          Comparing screenshot is not possible because no reference build was
          found.
          <div className="my-4">
            It may happens because:
            <ul className="ml-8 mt-2 list-disc space-y-1">
              <li>
                There is no Argos build on the{" "}
                <Code>{project.referenceBranch}</Code> branch yet
              </li>
              <li>
                Your pull-request is not rebased on{" "}
                <Code>{project.referenceBranch}</Code> branch
              </li>
            </ul>
          </div>
          To perform comparison, make sure that you have an Argos build on{" "}
          <Code>{project.referenceBranch}</Code> branch and that your
          pull-request is rebased.
        </>
      );

    case "reference":
      return (
        <>
          This build was performed on the reference branch. Screenshots will be
          used as a comparison baseline in next Argos builds
        </>
      );

    case "check": {
      switch (build.status) {
        case "stable": {
          if (checkIsBuildEmpty(build)) {
            return (
              <>
                No screenshot has been uploaded. Be sure to specify a directory
                containing images in your upload script.
              </>
            );
          }
          return <>This build is stable: no screenshot change detected.</>;
        }

        case "error":
          return <>The build has failed to be processed.</>;

        case "aborted":
          return <>This build has been voluntarily aborted.</>;

        case "diffDetected":
          return (
            <>
              Some differences have been detected between baseline branch and
              head.
            </>
          );

        case "progress":
          return <>This build is in progress.</>;
        case "accepted":
          return <>Changes have been accepted by a user.</>;
        case "rejected":
          return <>Changes have been rejected by a user.</>;
        default:
          return null;
      }
    }
    case null: {
      if (build.status === "pending") {
        return <>This build is in progress.</>;
      }
      return null;
    }
    default:
      throw new Error(`Unknown build type: ${build.type}`);
  }
};
