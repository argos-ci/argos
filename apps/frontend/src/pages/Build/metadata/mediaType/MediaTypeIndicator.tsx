import { LucideProps, Printer } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

export function MediaTypeIndicator({
  mediaType,
  ...props
}: LucideProps & {
  mediaType: string;
}) {
  if (mediaType === "print") {
    return (
      <Tooltip content="Print mode (media: print)">
        <Printer {...props} />
      </Tooltip>
    );
  }
  return null;
}
