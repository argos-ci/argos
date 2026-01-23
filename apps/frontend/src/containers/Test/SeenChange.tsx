import { graphql, type DocumentType } from "@/gql";
import { getBuildURL } from "@/pages/Build/BuildParams";
import type { ProjectParams } from "@/pages/Project/ProjectParams";
import { HeadlessLink } from "@/ui/Link";
import { Time } from "@/ui/Time";

const _SeenChangeFragment = graphql(`
  fragment ScreenChange_ScreenshotDiff on ScreenshotDiff {
    id
    createdAt
    build {
      id
      number
    }
  }
`);

export function SeenChange(props: {
  title?: string;
  params: ProjectParams;
  diff: DocumentType<typeof _SeenChangeFragment> | null;
}) {
  const { title, diff, params } = props;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-sm">
        {title ? <span className="font-semibold">{title}</span> : null}
        {diff ? (
          <>
            {title ? " " : null}
            <Time date={diff.createdAt} className="underline-emphasis" />
          </>
        ) : null}
      </div>
      {diff ? (
        <div className="text-low text-xs">
          In build{" "}
          <HeadlessLink
            className="rac-focus hover:text-default underline"
            href={getBuildURL({
              ...params,
              buildNumber: diff.build.number,
              diffId: diff.id,
            })}
          >
            #{diff.build.number}
          </HeadlessLink>
        </div>
      ) : (
        <div className="text-low text-xs">—</div>
      )}
    </div>
  );
}
