import React from "react";

export const MouseContext = React.createContext();

export function MouseInitializer({
  children,
  parentRef,
  scale = 1,
  mouseAnimation,
  mouseClickAnimation,
}) {
  async function move(
    { left, top, ...toOptions },
    { delay = 0.3, velocity = 1.2 } = {}
  ) {
    const scaleLeft = left / scale;
    const scaleTop = top / scale;

    await mouseAnimation.start({
      opacity: 1,
      transition: { delay, duration: 0.2 },
    });

    await mouseAnimation.start({
      left: scaleLeft,
      top: scaleTop,
      ...toOptions,
      transition: { duration: velocity },
    });
    await mouseClickAnimation.start({
      opacity: 1,
      transition: { delay: 0.3, duration: 0.3 },
    });
    await mouseAnimation.start({ opacity: 0.4, duration: 0.3 });
    await mouseClickAnimation.start({ opacity: 0, delay: 0.3, duration: 0.3 });
  }

  function getAbsolutePosition({
    parentRef,
    targetRef,
    options: { leftOffset = 0, topOffset = 0, scale } = {},
  }) {
    if (!parentRef.current || !targetRef.current) return { x: 0, y: 0 };
    const target = targetRef.current.getBoundingClientRect();
    const parent = parentRef.current.getBoundingClientRect();
    return {
      left: target.left - parent.left + target.width / 2 + leftOffset * scale,
      top: target.top - parent.top + target.height / 2 + topOffset * scale,
    };
  }

  async function moveToRef(targetRef, options = {}) {
    const { leftOffset, topOffset, ...moveOptions } = options;
    const targetPosition = getAbsolutePosition({
      parentRef,
      targetRef,
      options: { leftOffset, topOffset, scale: scale },
    });

    return move(targetPosition, moveOptions);
  }

  return (
    <MouseContext.Provider
      value={{ moveToRef, mouseAnimation, mouseClickAnimation }}
    >
      {children}
    </MouseContext.Provider>
  );
}

export function useMouse() {
  return React.useContext(MouseContext);
}
