type Owner = { name: string | null; email: string | null };

/**
 * How to open the email: "Hi Andre" reads as a personal note, "Hi team" is the
 * honest greeting once several people are on the thread.
 */
function getGreeting(owners: Owner[]): string {
  if (owners.length !== 1) {
    return "Hi team,";
  }

  const name = owners[0]?.name?.trim();
  const firstName = name ? name.split(/\s+/)[0] : null;

  // Account names are free text, and a slug like `acme-bot` is shaped exactly
  // like a hyphenated given name such as `Jean-Pierre`. The capital is what
  // separates them in practice, so it is required. Greeting a real person with
  // "Hi team" is a small miss; opening with "Hi acme-bot," undoes the point of
  // writing a personal note.
  if (!firstName || !/^\p{Uppercase_Letter}[\p{Letter}'-]*$/u.test(firstName)) {
    return "Hi team,";
  }

  return `Hi ${firstName},`;
}

/**
 * The onboarding email, drafted from what the dashboard already knows.
 *
 * A team that keeps building without ever producing a check build has a setup
 * problem, and saying so is a better opener than a generic welcome. Anything
 * else gets the plain welcome.
 */
export function getOnboardingEmail(input: {
  owners: Owner[];
  buildsCount: number;
  hasCheckBuild: boolean;
}): { subject: string; body: string } {
  const greeting = getGreeting(input.owners);
  const hasOnlyOrphanBuilds = input.buildsCount > 0 && !input.hasCheckBuild;

  if (hasOnlyOrphanBuilds) {
    return {
      subject: "Argos — help with your setup?",
      body: [
        greeting,
        "",
        "Thank you for trying Argos!",
        "",
        "I noticed that you have quite a few orphan builds. If you'd like, I'd be happy to help you get that sorted out.",
        "",
        "Feel free to reach out if you have any questions or need help with the setup.",
        "",
        "Have a great day,",
      ].join("\n"),
    };
  }

  return {
    subject: "Welcome to Argos!",
    body: [
      greeting,
      "",
      "Welcome to Argos!",
      "",
      "Don't hesitate to reach out if you have a question or need help with the set up.",
      "",
      "I would be happy to help.",
      "",
      "Have a nice day,",
    ].join("\n"),
  };
}

/**
 * Build the `mailto:` URL. Nothing is sent by Argos — this only opens the
 * staff member's own mail client with a draft they still have to review.
 */
export function getMailtoUrl(input: {
  owners: Owner[];
  subject: string;
  body: string;
}): string | null {
  const recipients = input.owners
    .map((owner) => owner.email)
    .filter((email): email is string => Boolean(email));

  if (recipients.length === 0) {
    return null;
  }

  const params = new URLSearchParams({
    subject: input.subject,
    body: input.body,
  });

  // `URLSearchParams` encodes spaces as `+`, which mail clients render
  // literally in the body.
  return `mailto:${recipients.join(",")}?${params.toString().replaceAll("+", "%20")}`;
}
