import { createContext, use, useCallback, useMemo, useState } from "react";
import { invariant } from "@argos/util/invariant";

import * as storage from "@/util/storage";

const STORAGE_KEY = "theme";

export enum ColorMode {
  Light = "light",
  Dark = "dark",
}

type ColorModeContextType = {
  colorMode: ColorMode | null;
  setColorMode: (colorMode: ColorMode | null) => void;
};

const ColorModeContext = createContext<ColorModeContextType | null>(null);

const getStorageTheme = () => {
  const value = storage.getItem(STORAGE_KEY);
  if (!value) {
    return null;
  }
  return value as ColorMode;
};

declare global {
  interface Window {
    updateColorModeClassName: () => void;
  }
}

export const ColorModeProvider = (props: { children: React.ReactNode }) => {
  const [colorMode, setColorMode] = useState<ColorMode | null>(getStorageTheme);

  const setColorModeAndStore = useCallback((colorMode: ColorMode | null) => {
    setColorMode(colorMode);
    if (colorMode) {
      storage.setItem(STORAGE_KEY, colorMode);
    } else {
      storage.removeItem(STORAGE_KEY);
    }
    window.updateColorModeClassName();
  }, []);

  const value = useMemo(
    () => ({
      colorMode,
      setColorMode: setColorModeAndStore,
    }),
    [colorMode, setColorModeAndStore],
  );

  return <ColorModeContext value={value}>{props.children}</ColorModeContext>;
};

export const useColorMode = () => {
  const context = use(ColorModeContext);
  invariant(context, "useColorMode must be used within a ColorModeProvider");
  return context;
};
