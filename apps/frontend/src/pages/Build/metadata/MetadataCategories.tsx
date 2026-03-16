import {
  GlobeIcon,
  LaptopIcon,
  MoonIcon,
  PrinterIcon,
  SmartphoneIcon,
  SunIcon,
  TabletIcon,
} from "lucide-react";

import { BrowserIcon } from "./browser/BrowserIcon";

export const categoryPluralLabels: Record<string, string> = {
  Browser: "browsers",
  Viewport: "viewports",
  "Color scheme": "color schemes",
  "Media type": "media types",
};

export const CategoryIcon = (props: { category: string }) => {
  const Icon = (() => {
    switch (props.category) {
      case "Browser":
        return GlobeIcon;
      case "Viewport":
        return LaptopIcon;
      case "Color scheme":
        return SunIcon;
      case "Media type":
        return PrinterIcon;
      default:
        return null;
    }
  })();
  return Icon ? <Icon className="size-3" /> : null;
};

export const TagValueIcon = (props: { category: string; value: string }) => {
  const iconSizeClass = "size-3 shrink-0";

  switch (props.category) {
    case "Browser":
      return (
        <BrowserIcon
          browser={{ name: props.value }}
          className={iconSizeClass}
        />
      );

    case "Viewport": {
      const width = Number(props.value.split("×")[0]) || 0;
      const Icon =
        width >= 1025 ? LaptopIcon : width >= 641 ? TabletIcon : SmartphoneIcon;
      return <Icon className={iconSizeClass} />;
    }

    case "Color scheme":
      return props.value === "dark" ? (
        <MoonIcon className={iconSizeClass} />
      ) : (
        <SunIcon className={iconSizeClass} />
      );

    case "Media type":
      return <PrinterIcon className={iconSizeClass} />;

    default:
      return null;
  }
};
