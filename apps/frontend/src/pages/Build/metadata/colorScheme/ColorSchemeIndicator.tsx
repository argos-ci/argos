import { LucideProps, Moon } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

export function ColorSchemeIndicator({
  colorScheme,
  ...props
}: LucideProps & {
  colorScheme: string;
}) {
  if (colorScheme === "dark") {
    return (
      <Tooltip content="Dark mode (colorScheme: dark)">
        <Moon {...props} />
      </Tooltip>
    );
  }
  return null;
}
