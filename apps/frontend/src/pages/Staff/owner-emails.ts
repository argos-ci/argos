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
