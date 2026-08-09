import { GitPullRequestArrowIcon } from "lucide-react";

import { BuildStatusChip } from "@/containers/BuildStatusChip";
import { DocumentType, graphql } from "@/gql";
import { getBuildURL } from "@/pages/Build/BuildParams";
import { Link } from "@/ui/Link";
import { ListRow } from "@/ui/List";
import { MediaWell } from "@/ui/MediaFrame";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

const _MediaPullRequestFragment = graphql(`
  fragment MediaPullRequestRow_MediaPullRequest on MediaPullRequest {
    id
    pullRequest {
      id
      number
      title
      url
      date
    }
    project {
      id
      name
      slug
      account {
        id
        slug
      }
    }
    latestBuild {
      id
      number
      ...BuildStatusChip_Build
    }
    media {
      id
      name
      state
      url
      latestVersion {
        id
        number
        fileUrl
        posterUrl
        isVideo
        width
        height
      }
    }
  }
`);

type MediaPullRequest = DocumentType<typeof _MediaPullRequestFragment>;

/**
 * One pull request and what was uploaded to it.
 *
 * Three destinations, because they answer three different questions: the pull
 * request itself (what changed), its latest Argos build (what the visual tests
 * said), and each media's share page (what it looks like, and what people said
 * about it). The row is not itself a link — it holds several, and swallowing them
 * into one would make the useful ones unreachable.
 */
export function MediaPullRequestRow(props: {
  mediaPullRequest: MediaPullRequest;
}) {
  const { mediaPullRequest } = props;
  const { pullRequest, project, latestBuild, media } = mediaPullRequest;

  return (
    <ListRow className="flex-col items-stretch gap-3 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <GitPullRequestArrowIcon className="text-low size-4 shrink-0" />
        <Link
          href={pullRequest.url}
          target="_blank"
          external={false}
          className="font-medium"
        >
          {pullRequest.title ?? `Pull request #${pullRequest.number}`}
        </Link>
        <span className="text-low text-xs tabular-nums">
          #{pullRequest.number}
        </span>
        <span className="text-low font-mono text-xs">{project.slug}</span>
        {pullRequest.date ? (
          <span className="text-low text-xs">
            <Time date={pullRequest.date} />
          </span>
        ) : null}
        {latestBuild ? (
          <Link
            href={getBuildURL({
              accountSlug: project.account.slug,
              projectName: project.name,
              buildNumber: latestBuild.number,
              diffId: null,
            })}
            className="ml-auto flex items-center gap-1.5 text-xs"
          >
            <BuildStatusChip build={latestBuild} />
            Build {latestBuild.number}
          </Link>
        ) : (
          // Said rather than left blank: "no build" is information — these
          // screenshots were uploaded by hand or by an agent, not by a test run.
          <span className="text-low ml-auto text-xs">No Argos build</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {media.map((item) => (
          <Tooltip
            key={item.id}
            content={
              <>
                {item.name}
                {item.state ? ` (${item.state})` : null}
                {item.latestVersion.number > 1
                  ? ` · v${item.latestVersion.number}`
                  : null}
              </>
            }
          >
            <Link
              href={item.url}
              className="block shrink-0 no-underline"
              aria-label={`${item.name}${item.state ? ` (${item.state})` : ""}`}
            >
              <MediaWell
                checkerSize={4}
                className="flex h-20 w-28 items-center justify-center transition hover:ring-white/25"
              >
                <img
                  // The poster for a video, so a row of thumbnails is a row of
                  // pictures rather than one blank box among them.
                  src={
                    item.latestVersion.posterUrl ?? item.latestVersion.fileUrl
                  }
                  alt=""
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </MediaWell>
            </Link>
          </Tooltip>
        ))}
      </div>
    </ListRow>
  );
}
