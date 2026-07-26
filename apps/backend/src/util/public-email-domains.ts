import freeEmailDomains from "free-email-domains";

/**
 * Providers `free-email-domains` does not list yet.
 *
 * That package aggregates HubSpot's free-domain list and two disposable-address
 * blocklists, which between them miss a few privacy-focused providers and
 * regional ISPs. Entries here are worth reporting upstream, but the gap should
 * not wait on that.
 */
const EXTRA_PUBLIC_EMAIL_DOMAINS = [
  // Privacy-focused providers
  "hey.com",
  "mailbox.org",
  "tuta.io",
  "tutamail.com",
  "tutanota.com",
  // ISPs
  "aliceadsl.fr",
  "bbox.fr",
  "neuf.fr",
  "o2.pl",
  "sfr.fr",
  "sympatico.ca",
  "talktalk.net",
  "telia.com",
  "telus.net",
];

/**
 * Email providers anyone can sign up with.
 *
 * A domain only says something about who you work with when your employer owns
 * it. Treating a shared provider as a company domain would let one team open
 * itself to every stranger using that provider, so these are never eligible for
 * team auto-join.
 *
 * Built once at module load, since the lookup runs on every eligibility check.
 */
const PUBLIC_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  ...freeEmailDomains.map((domain) => domain.toLowerCase()),
  ...EXTRA_PUBLIC_EMAIL_DOMAINS,
]);

/**
 * Whether the domain belongs to an email provider anyone can sign up with,
 * rather than to an organization.
 */
export function checkIsPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
}
