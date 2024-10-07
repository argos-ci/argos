import { FragmentType, graphql, useFragment } from "@/gql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Link } from "@/ui/Link";
import { Pre } from "@/ui/Pre";

const ProjectFragment = graphql(`
  fragment ProjectBadge_Project on Project {
    id
    slug
  }
`);

const BadgeBlock = (props: {
  title: string;
  url: string;
  projectSlug: string;
}) => {
  const refUrl = `https://app.argos-ci.com/${props.projectSlug}/reference`;
  return (
    <div className="rounded border p-4">
      <h3 className="mb-4 font-semibold">{props.title}</h3>
      <div className="mb-4 flex h-10">
        <a href={refUrl} title="Covered by Argos Visual Testing">
          <img src={props.url} alt="Argos Badge" />
        </a>
      </div>
      <div className="mb-1 text-xs font-medium">Markdown</div>
      <Pre
        className="text-sm"
        code={`[![Covered by Argos Visual Testing](${props.url})](${refUrl})`}
      />
    </div>
  );
};

export const ProjectBadge = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
  return (
    <Card>
      <CardBody>
        <CardTitle>Argos Badge</CardTitle>
        <CardParagraph>
          Embed Argos' badge in your{" "}
          <span className="font-medium">README.md</span> to have a quick link to
          the latest auto-approved build of your project.
        </CardParagraph>
        <div className="flex gap-4">
          <BadgeBlock
            title="Standard"
            url="https://argos-ci.com/badge.svg"
            projectSlug={project.slug}
          />
          <BadgeBlock
            title="Large"
            url="https://argos-ci.com/badge-large.svg"
            projectSlug={project.slug}
          />
        </div>
      </CardBody>
      <CardFooter>
        If your project is Open Source, read{" "}
        <Link href="https://argos-ci.com/docs/open-source" target="_blank">
          Argos documentation
        </Link>{" "}
        to learn more about Argos Open Source Sponsorship.
      </CardFooter>
    </Card>
  );
};
