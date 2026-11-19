import { useClipboard } from "use-clipboard-copy";

import { toast } from "@/ui/Toaster";

/** The addresses to write to, once each: an owner may have none on file. */
export function getOwnerEmails(
  owners: readonly { email: string | null }[],
): string[] {
  return Array.from(
    new Set(
      owners
        .map((owner) => owner.email)
        .filter((email): email is string => Boolean(email)),
    ),
  );
}

/**
 * Copy a team's owner addresses, comma-separated so they paste straight into
 * the recipients of an email.
 */
export function useCopyOwnerEmails() {
  const clipboard = useClipboard();
  return (owners: readonly { email: string | null }[]) => {
    const emails = getOwnerEmails(owners);
    clipboard.copy(emails.join(", "));
    // A menu closes on the click, so the toast is the only confirmation left.
    toast.success("Owner emails copied", {
      description:
        emails.length === 1 ? "1 address" : `${emails.length} addresses`,
    });
  };
}
