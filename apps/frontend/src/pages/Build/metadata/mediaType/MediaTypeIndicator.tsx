import { Tooltip } from "@/ui/Tooltip";
import { LucideProps, Printer } from "lucide-react";

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
