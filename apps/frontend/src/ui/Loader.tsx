import { SVGProps, useEffect, useState } from "react";

const SvgLoader = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlSpace="preserve"
    viewBox="0 0 2400 2400"
    {...props}
  >
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth={200}
    >
      <path d="M1200 600V100" />
      <path d="M1200 2300v-500" opacity={0.5} />
      <path d="m900 680.4-250-433" opacity={0.917} />
      <path d="m1750 2152.6-250-433" opacity={0.417} />
      <path d="m680.4 900-433-250" opacity={0.833} />
      <path d="m2152.6 1750-433-250" opacity={0.333} />
      <path d="M600 1200H100" opacity={0.75} />
      <path d="M2300 1200h-500" opacity={0.25} />
      <path d="m680.4 1500-433 250" opacity={0.667} />
      <path d="m2152.6 650-433 250" opacity={0.167} />
      <path d="m900 1719.6-250 433" opacity={0.583} />
      <path d="m1750 247.4-250 433" opacity={0.083} />
      <animateTransform
        attributeName="transform"
        attributeType="XML"
        begin="0s"
        calcMode="discrete"
        dur="0.83333s"
        keyTimes="0;0.08333;0.16667;0.25;0.33333;0.41667;0.5;0.58333;0.66667;0.75;0.83333;0.91667"
        repeatCount="indefinite"
        type="rotate"
        values="0 1199 1199;30 1199 1199;60 1199 1199;90 1199 1199;120 1199 1199;150 1199 1199;180 1199 1199;210 1199 1199;240 1199 1199;270 1199 1199;300 1199 1199;330 1199 1199"
      />
    </g>
  </svg>
);

export const useDelayedVisible = (delay: number) => {
  const [visible, setVisible] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) {
      return;
    }
    const timeout = setTimeout(() => {
      setVisible(true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay]);
  return visible;
};

export function Loader({
  delay = 400,
  className,
}: {
  delay?: number;
  className?: string;
}) {
  const visible = useDelayedVisible(delay);

  return (
    <SvgLoader
      role="status"
      aria-busy="true"
      className={className}
      style={!visible ? { visibility: "hidden" } : undefined}
    />
  );
}
