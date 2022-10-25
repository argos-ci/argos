import * as React from "react";
import { useColorMode, ColorModeProvider } from "@xstyled/styled-components";
import { GlobalStyle, ThemeInitializer } from "../apps/app/src/components";

const THEMES = {
  light: "default",
  dark: "dark",
};

const defaultTheme = "light";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

// Add button to select theme mode
export const globalTypes = {
  theme: {
    name: "Theme",
    title: "Theme",
    description: "Theme for your components",
    defaultValue: THEMES[defaultTheme],
    toolbar: {
      icon: "paintbrush",
      dynamicTitle: true,
      items: [
        { value: "light", left: "☀️", title: "Light mode" },
        { value: "dark", left: "🌙", title: "Dark mode" },
      ],
    },
  },
};

// Apply selected theme mode
const ColorModeDecorator = (Story, context) => {
  const { theme: themeKey } = context.globals;
  const theme = THEMES[themeKey] || THEMES[defaultTheme];

  const [, setColorMode] = useColorMode();

  React.useEffect(() => {
    setColorMode(theme);
  }, [setColorMode, theme]);

  return <Story />;
};

export const decorators = [
  ColorModeDecorator,
  (Story) => (
    <ThemeInitializer>
      <ColorModeProvider>
        <GlobalStyle />
        <Story />
      </ColorModeProvider>
    </ThemeInitializer>
  ),
];
