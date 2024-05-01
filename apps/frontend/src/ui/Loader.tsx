import { SVGProps, useEffect, useState } from "react";

const SvgLoader = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 135 140"
    fill="currentColor"
    data-visual-test="transparent"
    {...props}
  >
    <rect y={10} width={15} height={120} rx={6}>
      <animate
        attributeName="height"
        begin="0.5s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.5s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x={30} y={10} width={15} height={120} rx={6}>
      <animate
        attributeName="height"
        begin="0.25s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.25s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x={60} width={15} height={140} rx={6}>
      <animate
        attributeName="height"
        begin="0s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x={90} y={10} width={15} height={120} rx={6}>
      <animate
        attributeName="height"
        begin="0.25s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.25s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
    <rect x={120} y={10} width={15} height={120} rx={6}>
      <animate
        attributeName="height"
        begin="0.5s"
        dur="1s"
        values="120;110;100;90;80;70;60;50;40;140;120"
        calcMode="linear"
        repeatCount="indefinite"
      />
      <animate
        attributeName="y"
        begin="0.5s"
        dur="1s"
        values="10;15;20;25;30;35;40;45;50;0;10"
        calcMode="linear"
        repeatCount="indefinite"
      />
    </rect>
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

export const Loader = ({
  delay = 400,
  size = 64,
  className,
}: {
  delay?: number;
  size?: number;
  className?: string;
}) => {
  const visible = useDelayedVisible(delay);

  return (
    <SvgLoader
      role="status"
      aria-busy="true"
      className={className}
      style={{
        width: size,
        height: size,
        ...(!visible ? { visibility: "hidden" } : {}),
      }}
    />
  );
};
