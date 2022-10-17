import * as React from "react";
import {
  ThemeProvider,
  ColorModeProvider,
  useColorMode,
} from "@xstyled/styled-components";
import { GlobalStyle, theme } from "../apps/app/src/components";

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const THEMES = {
  light: "default",
  dark: "dark",
};

const defaultTheme = "dark";

// Add button to select theme mode
export const globalTypes = {
  theme: {
    name: "Theme",
    title: "Theme",
    description: "Theme for your components",
    defaultValue: defaultTheme,
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
  const theme = THEMES[themeKey] || defaultTheme;

  const [, setColorMode] = useColorMode();

  React.useEffect(() => {
    setColorMode(theme);
  }, [setColorMode, theme]);

  return <Story />;
};

export const decorators = [
  ColorModeDecorator,
  (Story) => (
    <ThemeProvider theme={theme}>
      <ColorModeProvider>
        <GlobalStyle />
        <Story />
      </ColorModeProvider>
    </ThemeProvider>
  ),
];
