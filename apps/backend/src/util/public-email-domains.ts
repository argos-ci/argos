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
 * Loaded on first use, not at module load: the package ships a 250 KB JSON array
 * of ~13k domains, and this is only consulted during signup and team creation —
 * so every web and worker process was parsing it, and holding the result, to
 * serve requests that never ask. The promise is cached rather than the set, so
 * concurrent callers share one import.
 */
let loading: Promise<ReadonlySet<string>> | null = null;

function loadPublicEmailDomains(): Promise<ReadonlySet<string>> {
  loading ??= import("free-email-domains").then(
    // No lowercasing pass: every entry in the published list is already
    // lowercase, and the argument is lowercased on lookup anyway.
    (mod) => new Set([...mod.default, ...EXTRA_PUBLIC_EMAIL_DOMAINS]),
  );
  return loading;
}

/**
 * Whether the domain belongs to an email provider anyone can sign up with,
 * rather than to an organization.
 */
export async function checkIsPublicEmailDomain(
  domain: string,
): Promise<boolean> {
  const publicEmailDomains = await loadPublicEmailDomains();
  return publicEmailDomains.has(domain.trim().toLowerCase());
}

/**
 * The domains in `domains` that no one can just sign up to.
 *
 * Offered alongside the single-domain check so a caller with a list pays one
 * await instead of one per entry.
 */
export async function filterOutPublicEmailDomains(
  domains: string[],
): Promise<string[]> {
  const publicEmailDomains = await loadPublicEmailDomains();
  return domains.filter(
    (domain) => !publicEmailDomains.has(domain.trim().toLowerCase()),
  );
}
