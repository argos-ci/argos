import { SpeakerXMarkIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import moment from "moment";

import { Test } from "@/gql/graphql";

import { MagicTooltip } from "./Tooltip";

export const MuteIndicator = ({
  test,
  className,
}: {
  test: Pick<Test, "mute" | "muteUntil"> | null;
  className?: string;
}) => {
  if (!test) return null;

  return test.mute ? (
    <div className={clsx(className, "flex h-5 items-center")}>
      <MagicTooltip
        tooltip={`Muted: detected changes won't affect the GitHub status check${
          test.muteUntil ? ` until ${moment(test.muteUntil).format("LLL")}` : ""
        }`}
      >
        <SpeakerXMarkIcon className="h-4 w-4 text-danger-500" />
      </MagicTooltip>
    </div>
  ) : null;
};
