import { FlagOffIcon, GitBranchIcon, LockIcon } from "lucide-react";

/**
 * Feature illustrations for empty states.
 *
 * They share one visual language: neutral "surfaces" that read as product
 * chrome, violet for whatever the feature acts on, and one supporting hue per
 * scene. Every colour is a Radix CSS variable, which the `.dark` class
 * re-points at the dark scale — so these follow the colour mode without a
 * second set of assets.
 */

const SURFACE = "var(--gray-1)";
const SURFACE_RAISED = "var(--gray-2)";
const SURFACE_SUNKEN = "var(--gray-3)";
const LINE = "var(--gray-6)";
const LINE_SOFT = "var(--gray-4)";
const CONTENT = "var(--gray-5)";
const CONTENT_STRONG = "var(--gray-8)";
const ACCENT = "var(--violet-9)";
const ACCENT_DEEP = "var(--violet-10)";
const ACCENT_SOFT = "var(--violet-3)";
const ACCENT_MID = "var(--violet-5)";
const ACCENT_LINE = "var(--violet-8)";
const SUCCESS = "var(--grass-9)";
const SUCCESS_SOFT = "var(--grass-4)";
const WARNING = "var(--orange-9)";

type IllustrationProps = { className?: string };

function Frame(props: {
  children: React.ReactNode;
  className: string | undefined;
}) {
  return (
    <svg
      viewBox="0 0 320 208"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className ?? "h-auto w-full"}
    >
      {props.children}
    </svg>
  );
}

/** Window chrome shared by the screenshot and browser scenes. */
function TitleBar(props: {
  x: number;
  y: number;
  width: number;
  radius: number;
  children?: React.ReactNode;
}) {
  const { x, y, width, radius, children } = props;
  const height = 16;
  return (
    <>
      <path
        d={`M${x} ${y + radius}a${radius} ${radius} 0 0 1 ${radius} -${radius}h${width - radius * 2}a${radius} ${radius} 0 0 1 ${radius} ${radius}v${height - radius}H${x}Z`}
        fill={SURFACE_SUNKEN}
      />
      <line
        x1={x}
        y1={y + height}
        x2={x + width}
        y2={y + height}
        stroke={LINE}
      />
      {[10, 18, 26].map((offset) => (
        <circle
          key={offset}
          cx={x + offset}
          cy={y + 8}
          r={2.5}
          fill={CONTENT_STRONG}
          opacity={0.5}
        />
      ))}
      {children}
    </>
  );
}

/** Repeated text lines used as filler content inside the scenes. */
function TextLines(props: {
  x: number;
  y: number;
  widths: number[];
  gap?: number;
  fill?: string;
  height?: number;
}) {
  const { x, y, widths, gap = 9, fill = CONTENT, height = 5 } = props;
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
 * A baseline and a candidate screenshot side by side, the differing region
 * called out, over the run history that turns those diffs into a flakiness
 * score.
 */
export function TestsIllustration(props: IllustrationProps) {
  const history = [5, 8, 6, 20, 7, 6, 24, 8, 6, 9, 16, 7];

  return (
    <Frame className={props.className}>
      <defs>
        <linearGradient id="tests-diff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT_MID} />
          <stop offset="100%" stopColor={ACCENT_SOFT} />
        </linearGradient>
      </defs>

      {/* Baseline and candidate screenshots. */}
      {[
        { x: 14, isCompare: false },
        { x: 168, isCompare: true },
      ].map(({ x, isCompare }) => (
        <g key={x}>
          <rect
            x={x}
            y={10}
            width={138}
            height={116}
            rx={9}
            fill={SURFACE}
            stroke={isCompare ? ACCENT_LINE : LINE}
          />
          <TitleBar x={x} y={10} width={138} radius={9}>
            <rect
              x={x + 36}
              y={14}
              width={54}
              height={8}
              rx={4}
              fill={SURFACE}
              stroke={LINE_SOFT}
            />
          </TitleBar>

          {/* Hero image block. */}
          <rect
            x={x + 10}
            y={36}
            width={118}
            height={38}
            rx={5}
            fill={SURFACE_RAISED}
            stroke={LINE_SOFT}
          />
          <path d={`M${x + 12} 72l24-20 16 14 13-11 21 17Z`} fill={CONTENT} />

          {/* The band that differs between the two shots. */}
          <rect
            x={x + 10}
            y={80}
            width={118}
            height={20}
            rx={4}
            fill={isCompare ? "url(#tests-diff)" : SURFACE_RAISED}
            stroke={isCompare ? ACCENT_LINE : LINE_SOFT}
            strokeDasharray={isCompare ? "4 3" : undefined}
          />
          <TextLines
            x={x + 17}
            y={86}
            widths={isCompare ? [72, 40] : [56, 30]}
            gap={8}
            height={4}
            fill={isCompare ? ACCENT_LINE : CONTENT}
          />
          {/* Selection handles, only on the changed region. */}
          {isCompare &&
            [
              [x + 10, 80],
              [x + 128, 80],
              [x + 10, 100],
              [x + 128, 100],
            ].map(([cx, cy]) => (
              <rect
                key={`${cx}-${cy}`}
                x={(cx ?? 0) - 2.5}
                y={(cy ?? 0) - 2.5}
                width={5}
                height={5}
                rx={1}
                fill={SURFACE}
                stroke={ACCENT}
                strokeWidth={1.5}
              />
            ))}

          <TextLines x={x + 10} y={108} widths={[86, 58]} gap={8} height={4} />

          {/* Baseline / changed badge. */}
          <rect
            x={x + 88}
            y={0}
            width={50}
            height={16}
            rx={8}
            fill={isCompare ? ACCENT : SURFACE_SUNKEN}
            stroke={isCompare ? ACCENT_DEEP : LINE}
          />
          <rect
            x={x + 97}
            y={6}
            width={32}
            height={4}
            rx={2}
            fill={isCompare ? "var(--violet-1)" : CONTENT_STRONG}
            opacity={isCompare ? 0.9 : 0.7}
          />
        </g>
      ))}

      {/* Comparison arrows between the two shots. */}
      <path
        d="M158 60h6m0 0-4-4m4 4-4 4"
        stroke={CONTENT_STRONG}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M162 78h-6m0 0 4-4m-4 4 4 4"
        stroke={CONTENT_STRONG}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Run history: how often this test changed, build over build. */}
      <rect
        x={14}
        y={136}
        width={292}
        height={62}
        rx={9}
        fill={SURFACE_RAISED}
        stroke={LINE}
      />
      <rect x={28} y={148} width={52} height={6} rx={3} fill={CONTENT_STRONG} />
      <circle cx={276} cy={151} r={5} fill={WARNING} />
      <rect x={288} y={148} width={18} height={6} rx={3} fill={CONTENT} />
      {history.map((height, index) => {
        const flagged = height > 12;
        return (
          <rect
            key={index}
            x={28 + index * 23.5}
            y={186 - height}
            width={13}
            height={height}
            rx={4}
            fill={flagged ? WARNING : LINE}
          />
        );
      })}
      <line
        x1={28}
        y1={188}
        x2={292}
        y2={188}
        stroke={LINE}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Frame>
  );
}

/**
 * The deployed page itself, with its address, its branch, and the deployments
 * that came before it.
 */
export function DeploymentsIllustration(props: IllustrationProps) {
  return (
    <Frame className={props.className}>
      <defs>
        <linearGradient id="deploy-hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ACCENT_MID} />
          <stop offset="100%" stopColor={ACCENT_SOFT} />
        </linearGradient>
      </defs>

      {/* Two earlier deployments, receding. */}
      <rect
        x={54}
        y={8}
        width={212}
        height={120}
        rx={10}
        fill={SURFACE_RAISED}
        stroke={LINE_SOFT}
        opacity={0.55}
      />
      <rect
        x={42}
        y={18}
        width={236}
        height={124}
        rx={10}
        fill={SURFACE_RAISED}
        stroke={LINE_SOFT}
        opacity={0.8}
      />

      {/* The live one. */}
      <rect
        x={28}
        y={28}
        width={264}
        height={124}
        rx={11}
        fill={SURFACE}
        stroke={LINE}
      />
      <TitleBar x={28} y={28} width={264} radius={11}>
        {/* Address bar with a padlock. */}
        <rect
          x={64}
          y={32}
          width={168}
          height={9}
          rx={4.5}
          fill={SURFACE}
          stroke={LINE_SOFT}
        />
        {/* Centred in the 9-unit address bar: 24 * 0.3 = 7.2 tall. */}
        <g transform="translate(69, 32.9) scale(0.3)">
          <LockIcon width={24} height={24} stroke={SUCCESS} strokeWidth={3} />
        </g>
        <rect
          x={80}
          y={35}
          width={70}
          height={3}
          rx={1.5}
          fill={CONTENT_STRONG}
        />
        <rect x={154} y={35} width={30} height={3} rx={1.5} fill={CONTENT} />
      </TitleBar>

      {/* Page navigation. */}
      <rect x={40} y={54} width={22} height={6} rx={3} fill={CONTENT_STRONG} />
      {[74, 104, 134].map((x) => (
        <rect
          key={x}
          x={x}
          y={55}
          width={22}
          height={4}
          rx={2}
          fill={CONTENT}
        />
      ))}
      <rect
        x={248}
        y={52}
        width={32}
        height={10}
        rx={5}
        fill={ACCENT}
        opacity={0.9}
      />

      {/* Hero + supporting copy. */}
      <rect
        x={40}
        y={70}
        width={110}
        height={70}
        rx={7}
        fill="url(#deploy-hero)"
        stroke={ACCENT_LINE}
        strokeOpacity={0.4}
      />
      <circle cx={62} cy={92} r={7} fill={ACCENT} opacity={0.55} />
      <path d="M46 134l24-22 16 15 14-11 22 18Z" fill={ACCENT} opacity={0.35} />
      <TextLines x={162} y={74} widths={[118, 96]} gap={11} height={7} />
      <TextLines
        x={162}
        y={100}
        widths={[110, 118, 74]}
        gap={9}
        height={4}
        fill={LINE_SOFT}
      />
      <rect x={162} y={130} width={44} height={10} rx={5} fill={CONTENT} />

      {/* Branch and status chips. */}
      <rect
        x={28}
        y={166}
        width={150}
        height={26}
        rx={13}
        fill={SURFACE_RAISED}
        stroke={LINE}
      />
      {/* Centred in the 26-unit chip: 24 * 0.62 = 14.9 tall. */}
      <g transform="translate(44, 173.5) scale(0.62)">
        <GitBranchIcon
          width={24}
          height={24}
          stroke={CONTENT_STRONG}
          strokeWidth={2.2}
        />
      </g>
      <rect
        x={68}
        y={176}
        width={92}
        height={5}
        rx={2.5}
        fill={CONTENT_STRONG}
      />

      <rect
        x={190}
        y={166}
        width={102}
        height={26}
        rx={13}
        fill={SUCCESS_SOFT}
        stroke={SUCCESS}
        strokeOpacity={0.45}
      />
      <circle cx={208} cy={179} r={5} fill={SUCCESS} />
      <path
        d="m205.6 179 1.7 1.8 3.3-3.4"
        stroke="var(--grass-1)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={220} y={176} width={56} height={5} rx={2.5} fill={SUCCESS} />
    </Frame>
  );
}

/**
 * A rule on a canvas: an event comes in, a condition filters it, and a message
 * goes out.
 */
export function AutomationsIllustration(props: IllustrationProps) {
  const nodes = [
    { x: 6, label: "when", widths: [28, 18] },
    { x: 112, label: "if", widths: [32, 22] },
  ];
  return (
    <Frame className={props.className}>
      <defs>
        <linearGradient id="automation-action" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ACCENT_MID} />
          <stop offset="100%" stopColor={ACCENT_SOFT} />
        </linearGradient>
        <pattern
          id="automation-grid"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill={LINE_SOFT} />
        </pattern>
      </defs>

      {/* Canvas the rule is laid out on. */}
      <rect
        x={4}
        y={10}
        width={312}
        height={188}
        rx={12}
        fill="url(#automation-grid)"
        opacity={0.7}
      />

      {/* Connectors. */}
      {[86, 192].map((x) => (
        <g key={x}>
          <path
            d={`M${x + 4} 74h14`}
            stroke={CONTENT_STRONG}
            strokeWidth={1.8}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <path
            d={`M${x + 16} 69.5 L${x + 24} 74 L${x + 16} 78.5 Z`}
            fill={CONTENT_STRONG}
          />
        </g>
      ))}

      {/* Trigger and condition nodes. */}
      {nodes.map((node) => (
        <g key={node.x}>
          <rect
            x={node.x}
            y={44}
            width={80}
            height={60}
            rx={9}
            fill={SURFACE}
            stroke={LINE}
          />
          <path
            d={`M${node.x} 53a9 9 0 0 1 9-9h62a9 9 0 0 1 9 9v7H${node.x}Z`}
            fill={SURFACE_SUNKEN}
          />
          <line x1={node.x} y1={60} x2={node.x + 80} y2={60} stroke={LINE} />
          <rect
            x={node.x + 10}
            y={49}
            width={node.label === "when" ? 26 : 14}
            height={5}
            rx={2.5}
            fill={CONTENT_STRONG}
          />
          <circle cx={node.x + 19} cy={78} r={8} fill={SURFACE_SUNKEN} />
          <circle cx={node.x + 19} cy={78} r={3.5} fill={CONTENT_STRONG} />
          <TextLines
            x={node.x + 33}
            y={71}
            widths={node.widths}
            gap={9}
            height={5}
          />
          <circle
            cx={node.x + 80}
            cy={74}
            r={3.5}
            fill={SURFACE}
            stroke={CONTENT_STRONG}
            strokeWidth={1.5}
          />
        </g>
      ))}

      {/* Action node, the one that fires. */}
      <rect
        x={218}
        y={44}
        width={80}
        height={60}
        rx={9}
        fill="url(#automation-action)"
        stroke={ACCENT_LINE}
      />
      <path
        d="M218 53a9 9 0 0 1 9-9h62a9 9 0 0 1 9 9v7h-80Z"
        fill={ACCENT}
        opacity={0.22}
      />
      <line
        x1={218}
        y1={60}
        x2={298}
        y2={60}
        stroke={ACCENT_LINE}
        opacity={0.5}
      />
      <rect x={228} y={49} width={22} height={5} rx={2.5} fill={ACCENT_DEEP} />
      <circle cx={237} cy={78} r={8} fill={ACCENT} />
      <path
        d="M233.5 78.5l2.5 2.5 4.5-5"
        stroke="var(--violet-1)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <TextLines
        x={251}
        y={71}
        widths={[36, 24]}
        gap={9}
        height={5}
        fill={ACCENT_LINE}
      />

      {/* The rule firing: rays fanning off the node's top-right corner, along
          its diagonal. */}
      {["M291 33l-3-9", "M300 36l6-8", "M306 44l10-4"].map((d) => (
        <path
          key={d}
          d={d}
          stroke={ACCENT}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      ))}

      {/* The message it posts. */}
      <rect
        x={88}
        y={130}
        width={210}
        height={56}
        rx={9}
        fill={SURFACE}
        stroke={LINE}
      />
      <path
        d="M240 104c0 16-90 8-108 24"
        stroke={LINE}
        strokeWidth={1.6}
        strokeDasharray="4 4"
        fill="none"
      />
      <rect x={100} y={142} width={22} height={22} rx={6} fill={ACCENT} />
      <path
        d="M106 153h10M106 149h10M106 157h6"
        stroke="var(--violet-1)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <rect
        x={132}
        y={142}
        width={54}
        height={5}
        rx={2.5}
        fill={CONTENT_STRONG}
      />
      <rect x={192} y={142} width={26} height={5} rx={2.5} fill={LINE_SOFT} />
      <TextLines
        x={132}
        y={154}
        widths={[154, 112]}
        gap={9}
        height={4}
        fill={CONTENT}
      />
    </Frame>
  );
}

/**
 * One change coming back build after build, and the rule that stops it from
 * asking for review each time.
 */
export function IgnoredChangesIllustration(props: IllustrationProps) {
  return (
    <Frame className={props.className}>
      <defs>
        <linearGradient id="ignored-diff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT_MID} />
          <stop offset="100%" stopColor={ACCENT_SOFT} />
        </linearGradient>
      </defs>

      {/* The same change, coming back build after build. */}
      {[
        { x: 74, y: 34, opacity: 0.4 },
        { x: 62, y: 24, opacity: 0.7 },
      ].map((ghost) => (
        <rect
          key={ghost.x}
          x={ghost.x}
          y={ghost.y}
          width={196}
          height={112}
          rx={10}
          fill={SURFACE_RAISED}
          stroke={LINE_SOFT}
          opacity={ghost.opacity}
        />
      ))}

      <rect
        x={50}
        y={14}
        width={196}
        height={116}
        rx={10}
        fill={SURFACE}
        stroke={LINE}
      />
      <TitleBar x={50} y={14} width={196} radius={10}>
        <rect
          x={86}
          y={18}
          width={80}
          height={8}
          rx={4}
          fill={SURFACE}
          stroke={LINE_SOFT}
        />
      </TitleBar>

      <TextLines x={66} y={44} widths={[104, 68]} gap={11} height={6} />

      {/* The recurring diff, marked as handled rather than raised again. */}
      <rect
        x={66}
        y={70}
        width={164}
        height={32}
        rx={5}
        fill="url(#ignored-diff)"
        stroke={ACCENT_LINE}
        strokeDasharray="5 3"
      />
      <TextLines
        x={78}
        y={79}
        widths={[104, 66]}
        gap={10}
        height={5}
        fill={ACCENT_LINE}
      />
      <TextLines x={66} y={110} widths={[76, 130]} gap={9} height={5} />

      {/* Occurrence counter on the stack. */}
      <rect
        x={206}
        y={2}
        width={58}
        height={22}
        rx={11}
        fill={SURFACE_SUNKEN}
        stroke={LINE}
      />
      <circle cx={220} cy={13} r={4} fill={WARNING} />
      <rect x={230} y={10} width={24} height={6} rx={3} fill={CONTENT_STRONG} />

      {/* Muted badge, clear of the card so the glyph stays legible. */}
      <circle
        cx={48}
        cy={112}
        r={30}
        fill={SURFACE}
        stroke={LINE}
        strokeWidth={2}
      />
      <g transform="translate(30, 94) scale(1.5)">
        <FlagOffIcon width={24} height={24} stroke={ACCENT} strokeWidth={1.8} />
      </g>

      {/* Builds since: raised at first, then quietly skipped. */}
      <line
        x1={30}
        y1={172}
        x2={290}
        y2={172}
        stroke={LINE}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeDasharray="3 5"
      />
      {[30, 73, 116, 159, 202, 245, 290].map((cx, index) => {
        const skipped = index >= 3;
        return (
          <circle
            key={cx}
            cx={cx}
            cy={172}
            r={skipped ? 5 : 6}
            fill={skipped ? SURFACE : ACCENT}
            stroke={skipped ? CONTENT_STRONG : ACCENT}
            strokeWidth={1.5}
          />
        );
      })}
    </Frame>
  );
}
