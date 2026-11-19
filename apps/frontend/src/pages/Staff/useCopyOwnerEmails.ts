import { useClipboard } from "use-clipboard-copy";

import { toast } from "@/ui/Toaster";

import { getOwnerEmails } from "./owner-emails";

/**
 * Copies the owners' addresses, comma-separated so they paste straight into the
 * recipients of an email. Null when no owner has an address on file.
 */
export function useCopyOwnerEmails(
  owners: readonly { email: string | null }[],
): (() => void) | null {
  const clipboard = useClipboard();
  const emails = getOwnerEmails(owners);

  if (emails.length === 0) {
    return null;
  }

  return () => {
    clipboard.copy(emails.join(", "));
    // A menu closes on the click, so the toast is the only confirmation left.
    toast.success("Owner emails copied", {
      description:
        emails.length === 1 ? "1 address" : `${emails.length} addresses`,
    });
  };
}
