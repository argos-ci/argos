import { atomWithStorage } from "jotai/utils";

import { Chip } from "@/ui/Chip";

export const lastLoginMethodAtom = atomWithStorage<
  "email" | "google" | "github" | "gitlab" | null
>("lastLoginMethod", null);

export function LastUsedIndicator(props: {
  isEnabled: boolean;
  children: React.ReactNode;
}) {
  if (!props.isEnabled) {
    return props.children;
  }

  return (
    <div className="relative">
      {props.children}
      <Chip
        scale="xs"
        className="absolute top-0 -right-2 inline-block -translate-y-1/2"
      >
        Last used
      </Chip>
    </div>
  );
}
