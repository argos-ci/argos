import { Toaster as Sonner, ToasterProps } from "sonner";

import { useColorMode } from "@/ui/ColorMode";

export function Toaster(props: ToasterProps) {
  const { colorMode } = useColorMode();
  return (
    <Sonner
      theme={colorMode ?? "system"}
      className="toaster group"
      {...props}
    />
  );
}
