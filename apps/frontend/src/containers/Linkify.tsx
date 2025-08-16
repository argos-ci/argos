import "linkifyjs";
import "linkify-plugin-ticket";

import { useMemo } from "react";
import BaseLinkify from "linkify-react";

interface ArgosLinkifyOptions {
  repoUrl: string | undefined | null;
}

function useLinkifyOptions(props: ArgosLinkifyOptions) {
  const { repoUrl } = props;
  return useMemo<import("linkifyjs").Opts>(() => {
    return {
      defaultProtocol: "https",
      formatHref: {
        ticket: (href) =>
          repoUrl ? `${repoUrl}/issues/${href.substring(1)}` : "",
      },
      render: ({ attributes, content }) => {
        if (!attributes.href) {
          return <span>{content}</span>;
        }
        return (
          <a {...attributes} className="underline-link">
            {content}
          </a>
        );
      },
    };
  }, [repoUrl]);
}

interface LinkifyProps extends ArgosLinkifyOptions {
  children: string;
}

export function Linkify(props: LinkifyProps) {
  const linkifyOptions = useLinkifyOptions({ repoUrl: props.repoUrl });
  return <BaseLinkify options={linkifyOptions}>{props.children}</BaseLinkify>;
}
