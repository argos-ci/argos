// import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";

import { Page } from "@/ui/Layout";

import { useProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

function PageContent(props: { accountSlug: string; projectName: string }) {
  // const project = useSuspenseQuery(ProjectQuery, {
  //   variables: {
  //     accountSlug: props.accountSlug,
  //     projectName: props.projectName,
  //   },
  // });

  return <div>Hello</div>;
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const { accountSlug, projectName } = params;

  return (
    <Page>
      <ProjectTitle params={params}>Tests</ProjectTitle>
      <PageContent accountSlug={accountSlug} projectName={projectName} />
    </Page>
  );
}
