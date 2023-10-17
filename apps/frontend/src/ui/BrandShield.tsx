import { forwardRef } from "react";

export const BrandShield = forwardRef(
  (
    props: React.SVGProps<SVGSVGElement>,
    ref: React.ForwardedRef<SVGSVGElement>,
  ) => {
    return (
      <svg
        ref={ref}
        viewBox="0 150 900 590"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        <linearGradient
          id="a"
          x1="80.12%"
          x2="35.629%"
          y1="36.832%"
          y2="66.909%"
        >
          <stop offset={0} stopColor="#804fce" />
          <stop offset={1} stopColor="#2d3383" />
        </linearGradient>
        <radialGradient id="b" cx="65.288%" cy="50%" r="69.141%">
          <stop offset={0} stopColor="#311476" />
          <stop offset={1} stopColor="#2b214f" />
        </radialGradient>
        <radialGradient
          id="c"
          cx="27.06%"
          cy="33.218%"
          gradientTransform="matrix(.6552 .75535 -.7552 .65532 .344 -.09)"
          r="78.741%"
        >
          <stop offset={0} stopColor="#1b357a" />
          <stop offset={1} stopColor="#512bcd" />
        </radialGradient>
        <radialGradient
          id="d"
          cx="27.334%"
          cy="24.819%"
          gradientTransform="matrix(.50144 .85984 -.84448 .51056 .346 -.114)"
          r="87.436%"
        >
          <stop offset={0} stopColor="#493ca8" />
          <stop offset={1} stopColor="#512bcc" />
        </radialGradient>
        <g fill="none" fillRule="evenodd" transform="translate(0 168.54)">
          <path
            d="M0 280.633C139.184 93.544 289.245 0 450.182 0c160.936 0 310.314 93.544 448.133 280.633C760.495 468.825 611.118 562.92 450.182 562.92c-160.937 0-310.998-94.096-450.182-282.288z"
            fill="url(#a)"
          />
          <path
            d="M452.38 515.73c129.93 0 235.26-105.263 235.26-235.112S582.31 45.506 452.38 45.506 217.119 150.769 217.119 280.618c0 36.35-7.453 198.8 12.177 156.292s22.26-53.344 34.659-38.476C307.11 450.183 379.703 515.73 452.38 515.73z"
            fill="#fff"
          />
          <circle cx={452.528} cy={280.618} fill="url(#b)" r={160.955} />
          <path
            d="M453.12 441.534c89.012.008 161.164-72.13 161.156-161.124-62.65 155.064-243.446 118.941-277.842 37.87S359.639 120.07 453.09 119.256c-89.012-.008-161.164 72.13-161.155 161.124s72.173 161.145 161.184 161.154z"
            fill="url(#c)"
            transform="rotate(-22 453.106 280.395)"
          />
          <path
            d="M457.249 419.683c73.873.761 154.047-65.21 154.039-154.204-62.65 155.063-196.17 119.04-230.565 37.969-34.396-81.071 32.009-168.34 87.006-178.93-89.01-.008-156.99 61.664-156.981 150.658.008 88.994 72.627 143.746 146.5 144.507z"
            fill="url(#d)"
            transform="rotate(-22 461.018 272.104)"
          />
        </g>
      </svg>
    );
  },
);
