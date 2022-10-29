import { useEffect, useState } from "react";

export function useToast({ ms = 3000, onHide } = {}) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    let timer;
    if (showToast) {
      timer = setTimeout(() => {
        setShowToast(false);
        if (onHide) onHide();
      }, ms);
    }
    return () => clearTimeout(timer);
  }, [ms, showToast, onHide]);

  return {
    show: () => setShowToast(true),
    hide: () => setShowToast(false),
    visible: showToast,
    setShowToast,
  };
}

export function Toast({ state, children }) {
  return state.visible ? <>{children}</> : null;
}
