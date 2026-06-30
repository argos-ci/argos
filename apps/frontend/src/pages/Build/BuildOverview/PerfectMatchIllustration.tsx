/**
 * Flat illustration for the "no changes" state: two overlapping screenshot
 * windows with a green check, signalling a perfect match against the baseline.
 * Colors reference the theme's CSS variables so it adapts to light/dark mode.
 */
const colors = {
  surface: "var(--background-color-app)",
  border: "var(--border-color-low)",
  muted: "var(--text-color-low)",
  accent: "var(--background-color-primary-ui)",
  success: "var(--background-color-success-solid)",
};

export function PerfectMatchIllustration(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 200"
      fill="none"
      role="img"
      aria-label="Screenshots match the baseline"
      className={props.className}
    >
      {/* Back window, faded to sit behind the front one */}
      <g opacity={0.5}>
        <rect
          x={104}
          y={14}
          width={168}
          height={116}
          rx={14}
          style={{ fill: colors.surface, stroke: colors.border }}
          strokeWidth={2}
        />
        <circle cx={122} cy={32} r={3} style={{ fill: colors.border }} />
        <circle cx={134} cy={32} r={3} style={{ fill: colors.border }} />
        <circle cx={146} cy={32} r={3} style={{ fill: colors.border }} />
        <rect
          x={120}
          y={50}
          width={136}
          height={64}
          rx={6}
          style={{ fill: colors.accent }}
        />
      </g>

      {/* Front window */}
      <rect
        x={28}
        y={58}
        width={168}
        height={116}
        rx={14}
        style={{ fill: colors.surface, stroke: colors.border }}
        strokeWidth={2}
      />
      <circle cx={46} cy={76} r={3} style={{ fill: colors.border }} />
      <circle cx={58} cy={76} r={3} style={{ fill: colors.border }} />
      <circle cx={70} cy={76} r={3} style={{ fill: colors.border }} />

      {/* Screenshot preview: sun + mountains on a tinted block */}
      <rect
        x={46}
        y={94}
        width={132}
        height={46}
        rx={6}
        style={{ fill: colors.accent }}
      />
      <circle cx={68} cy={110} r={6} style={{ fill: colors.surface }} />
      <path
        d="M92 134 L116 106 L140 134 Z"
        style={{ fill: colors.surface }}
        opacity={0.9}
      />
      <path
        d="M128 134 L150 114 L172 134 Z"
        style={{ fill: colors.surface }}
        opacity={0.7}
      />

      {/* Caption lines */}
      <rect
        x={46}
        y={150}
        width={120}
        height={7}
        rx={3.5}
        style={{ fill: colors.muted }}
        opacity={0.35}
      />
      <rect
        x={46}
        y={162}
        width={78}
        height={7}
        rx={3.5}
        style={{ fill: colors.muted }}
        opacity={0.35}
      />

      {/* Success badge straddling the front window's corner */}
      <circle cx={188} cy={166} r={26} style={{ fill: colors.surface }} />
      <circle cx={188} cy={166} r={20} style={{ fill: colors.success }} />
      <path
        d="M179 166 l6 6 l11 -13"
        fill="none"
        stroke="#fff"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
