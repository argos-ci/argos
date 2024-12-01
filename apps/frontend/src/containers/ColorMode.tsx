import * as React from "react";
import { invariant } from "@argos/util/invariant";

const STORAGE_KEY = "theme";

export enum ColorMode {
  Light = "light",
  Dark = "dark",
}

type ColorModeContextType = {
  colorMode: ColorMode | null;
  setColorMode: (colorMode: ColorMode | null) => void;
};

const ColorModeContext = React.createContext<ColorModeContextType | null>(null);

const getStorageTheme = () => {
  const value = window.localStorage.getItem(STORAGE_KEY);
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
  const [colorMode, setColorMode] = React.useState<ColorMode | null>(
    getStorageTheme,
  );

  const setColorModeAndStore = React.useCallback(
    (colorMode: ColorMode | null) => {
      setColorMode(colorMode);
      if (colorMode) {
        window.localStorage.setItem(STORAGE_KEY, colorMode);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      window.updateColorModeClassName();
    },
    [],
  );

  const value = React.useMemo(
    () => ({
      colorMode,
      setColorMode: setColorModeAndStore,
    }),
    [colorMode, setColorModeAndStore],
  );

  return (
    <ColorModeContext.Provider value={value}>
      {props.children}
    </ColorModeContext.Provider>
  );
};

export const useColorMode = () => {
  const context = React.useContext(ColorModeContext);
  invariant(context, "useColorMode must be used within a ColorModeProvider");
  return context;
};
