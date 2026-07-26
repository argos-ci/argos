import { CheckIcon, GitBranchIcon, XIcon } from "lucide-react";

import {
  ACCENT,
  ACCENT_LINE,
  ACCENT_MID,
  ACCENT_SOFT,
  CONTENT,
  CONTENT_STRONG,
  LINE,
  LINE_SOFT,
  SUCCESS,
  SURFACE,
  SURFACE_RAISED,
  SURFACE_SUNKEN,
} from "./illustration-tokens";

/** Top edge of a panel: rounded above, square below, so it can butt onto a body. */
function PanelTop(props: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: string;
}) {
  const { x, y, width, height, radius, fill } = props;
  return (
    <path
      d={`M${x} ${y + radius}a${radius} ${radius} 0 0 1 ${radius} -${radius}h${width - radius * 2}a${radius} ${radius} 0 0 1 ${radius} ${radius}v${height - radius}H${x}Z`}
      fill={fill}
    />
  );
}

function TextLines(props: {
  x: number;
  y: number;
  widths: number[];
  gap?: number;
  fill?: string;
  height?: number;
}) {
  const { x, y, widths, gap = 10, fill = CONTENT, height = 5 } = props;
  return (
    <>
      {widths.map((width, index) => (
        <rect
          key={index}
          x={x}
          y={y + index * gap}
          width={width}
          height={height}
          rx={height / 2}
          fill={fill}
        />
      ))}
    </>
  );
}

/**
 * One screenshot in the comparison: a miniature page, wireframed just far enough
 * to read as a rendered site rather than filler bars.
 *
 * `changed` swaps the hero for the violet diff region and pushes everything
 * under it down — the change being reviewed is a layout shift, which is what
 * Argos actually tends to catch.
 */
function Screenshot(props: { x: number; y: number; changed?: boolean }) {
  const { x, y, changed = false } = props;
  const width = 132;
  const height = 100;
  const heroHeight = changed ? 34 : 30;
  const belowHero = y + 22 + heroHeight + 8;

  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        fill={SURFACE}
        stroke={LINE_SOFT}
      />
      <PanelTop
        x={x}
        y={y}
        width={width}
        height={13}
        radius={6}
        fill={SURFACE_SUNKEN}
      />
      {/* The site's own header: a mark and two nav items. */}
      <rect x={x + 8} y={y + 4} width={6} height={6} rx={2} fill={ACCENT} />
      <rect
        x={x + 100}
        y={y + 5}
        width={12}
        height={4}
        rx={2}
        fill={CONTENT_STRONG}
        opacity={0.6}
      />
      <rect
        x={x + 116}
        y={y + 5}
        width={8}
        height={4}
        rx={2}
        fill={CONTENT_STRONG}
        opacity={0.6}
      />

      {/* The hero: neutral on the baseline, the called-out change on the run. */}
      <rect
        x={x + 10}
        y={y + 22}
        width={112}
        height={heroHeight}
        rx={4}
        fill={changed ? "url(#welcome-change)" : SURFACE_RAISED}
        stroke={changed ? ACCENT_LINE : LINE_SOFT}
        strokeDasharray={changed ? "4 3" : undefined}
      />
      <TextLines
        x={x + 18}
        y={y + 31}
        widths={[76, 52]}
        gap={9}
        height={4}
        fill={changed ? ACCENT_LINE : CONTENT}
      />

      <TextLines
        x={x + 10}
        y={belowHero}
        widths={[96, 68]}
        gap={9}
        height={4}
      />
      <rect
        x={x + 10}
        y={belowHero + 24}
        width={38}
        height={10}
        rx={5}
        fill={changed ? ACCENT_MID : SURFACE_SUNKEN}
        stroke={changed ? ACCENT_LINE : LINE_SOFT}
      />
    </>
  );
}

/**
 * A build under review: the run beside its baseline, the change called out, and
 * the two controls that settle it.
 *
 * The one scene in the product worth showing someone who has not used it yet —
 * so it runs bigger and denser than the empty-state illustrations, and keeps a
 * single focal point: the violet diff, with the comparison slider sitting on it.
 */
export function WelcomeIllustration(props: { className?: string }) {
  const sidebarRows = [0, 1, 2, 3];

  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className ?? "h-auto w-full"}
      role="presentation"
    >
      <defs>
        <linearGradient id="welcome-change" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT_MID} />
          <stop offset="100%" stopColor={ACCENT_SOFT} />
        </linearGradient>
        <radialGradient id="welcome-halo" cx="50%" cy="42%" r="52%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.2} />
          <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
        </radialGradient>
        <filter
          id="welcome-lift"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="10"
            floodColor="var(--gray-12)"
            floodOpacity="0.14"
          />
        </filter>
      </defs>

      <rect x={0} y={0} width={400} height={300} fill="url(#welcome-halo)" />

      {/* The baseline build this run is measured against, stacked behind. */}
      <rect
        x={32}
        y={14}
        width={336}
        height={40}
        rx={12}
        fill={SURFACE_RAISED}
        stroke={LINE_SOFT}
        opacity={0.8}
      />

      <g filter="url(#welcome-lift)">
        <rect
          x={16}
          y={24}
          width={368}
          height={244}
          rx={14}
          fill={SURFACE}
          stroke={LINE}
        />
      </g>

      {/* Window chrome: which branch and commit produced the run, and how much
          it changed. */}
      <PanelTop
        x={16}
        y={24}
        width={368}
        height={30}
        radius={14}
        fill={SURFACE_SUNKEN}
      />
      <line x1={16} y1={54} x2={384} y2={54} stroke={LINE} />
      {[34, 46, 58].map((cx) => (
        <circle
          key={cx}
          cx={cx}
          cy={39}
          r={3.5}
          fill={CONTENT_STRONG}
          opacity={0.45}
        />
      ))}
      <rect
        x={122}
        y={30}
        width={122}
        height={18}
        rx={9}
        fill={SURFACE}
        stroke={LINE_SOFT}
      />
      <g transform="translate(129, 34)">
        <GitBranchIcon
          width={11}
          height={11}
          stroke={CONTENT_STRONG}
          strokeWidth={2}
        />
      </g>
      <rect
        x={145}
        y={36}
        width={34}
        height={5}
        rx={2.5}
        fill={CONTENT_STRONG}
      />
      <circle cx={186} cy={39} r={1.5} fill={CONTENT} />
      <rect x={193} y={36} width={42} height={5} rx={2.5} fill={CONTENT} />

      <rect
        x={294}
        y={30}
        width={78}
        height={18}
        rx={9}
        fill={ACCENT_SOFT}
        stroke={ACCENT_LINE}
      />
      <circle cx={306} cy={39} r={3.5} fill={ACCENT} />
      <rect x={315} y={36} width={46} height={5} rx={2.5} fill={ACCENT_LINE} />

      {/* Sidebar: the screenshots in this build, the one under review picked. */}
      <path d="M16 54h72v158H16Z" fill={SURFACE_RAISED} />
      <line x1={88} y1={54} x2={88} y2={212} stroke={LINE} />
      {sidebarRows.map((row) => {
        const y = 66 + row * 34;
        const selected = row === 1;
        return (
          <g key={row}>
            {selected ? (
              <>
                <rect
                  x={16}
                  y={y - 5}
                  width={72}
                  height={30}
                  fill={ACCENT_SOFT}
                />
                <rect x={16} y={y - 5} width={2.5} height={30} fill={ACCENT} />
              </>
            ) : null}
            <rect
              x={26}
              y={y}
              width={30}
              height={20}
              rx={3}
              fill={SURFACE}
              stroke={selected ? ACCENT_LINE : LINE_SOFT}
            />
            <TextLines
              x={62}
              y={y + 4}
              widths={[18, 12]}
              gap={8}
              height={4}
              fill={selected ? ACCENT_LINE : CONTENT}
            />
          </g>
        );
      })}

      {/* Baseline and run, labelled, with the change called out on the run. */}
      <rect x={100} y={64} width={38} height={5} rx={2.5} fill={CONTENT} />
      <rect x={240} y={64} width={30} height={5} rx={2.5} fill={ACCENT_LINE} />
      <Screenshot x={100} y={76} />
      <Screenshot x={240} y={76} changed />

      {/* The comparison slider, sitting between the two. */}
      <line
        x1={236}
        y1={76}
        x2={236}
        y2={176}
        stroke={ACCENT}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle
        cx={236}
        cy={126}
        r={11}
        fill={SURFACE}
        stroke={ACCENT}
        strokeWidth={2}
      />
      <path
        d="M233.5 122.5 231 126l2.5 3.5M238.5 122.5 241 126l-2.5 3.5"
        stroke={ACCENT}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Footer: how far through the build's screenshots the review is, and the
          two buttons that settle the one on screen. Button-sized rather than a
          full-width bar, so they read as controls at a glance. */}
      <line x1={16} y1={212} x2={384} y2={212} stroke={LINE} />

      <rect
        x={32}
        y={236}
        width={104}
        height={6}
        rx={3}
        fill={SURFACE_SUNKEN}
      />
      <rect x={32} y={236} width={62} height={6} rx={3} fill={ACCENT} />
      <rect x={32} y={224} width={40} height={5} rx={2.5} fill={CONTENT} />

      {/* Reject: present, but plainly the secondary of the two. */}
      <rect
        x={246}
        y={226}
        width={58}
        height={26}
        rx={8}
        fill={SURFACE}
        stroke={LINE}
      />
      <g transform="translate(256, 233)">
        <XIcon
          width={12}
          height={12}
          stroke={CONTENT_STRONG}
          strokeWidth={2.4}
        />
      </g>
      <rect x={272} y={236} width={22} height={5} rx={2.5} fill={CONTENT} />

      {/* Approve: the one green thing on the page, because it is the decision
          the whole screen leads to. */}
      <rect
        x={312}
        y={226}
        width={62}
        height={26}
        rx={8}
        fill={SUCCESS}
        stroke={SUCCESS}
      />
      <g transform="translate(322, 233)">
        <CheckIcon width={12} height={12} stroke="#fff" strokeWidth={2.8} />
      </g>
      <rect
        x={338}
        y={236}
        width={26}
        height={5}
        rx={2.5}
        fill="#fff"
        opacity={0.92}
      />
    </svg>
  );
}
