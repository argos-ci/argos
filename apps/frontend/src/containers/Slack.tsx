export function SlackColoredLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      aria-label="Slack"
      viewBox="0 0 60 60"
      {...props}
    >
      <path
        fill="#36C5F0"
        d="M22 12a6 6 0 1 1 6-6v6zm0 4a6 6 0 0 1 0 12H6a6 6 0 1 1 0-12"
      />
      <path
        fill="#2EB67D"
        d="M48 22a6 6 0 1 1 6 6h-6zM32 6a6 6 0 1 1 12 0v16a6 6 0 0 1-12 0z"
      />
      <path
        fill="#ECB22E"
        d="M38 48a6 6 0 1 1-6 6v-6zm16-16a6 6 0 0 1 0 12H38a6 6 0 1 1 0-12"
      />
      <path
        fill="#E01E5A"
        d="M12 38a6 6 0 1 1-6-6h6zm4 0a6 6 0 1 1 12 0v16a6 6 0 0 1-12 0z"
      />
    </svg>
  );
}
