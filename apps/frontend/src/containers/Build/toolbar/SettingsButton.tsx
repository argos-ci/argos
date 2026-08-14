import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { useAtom } from "jotai/react";
import { PaintbrushIcon } from "lucide-react";
import { Heading } from "react-aria-components";

import { Button } from "@/ui/Button";
import { ColorSwatchPicker, ColorSwatchPickerItem } from "@/ui/ColorPicker";
import { Dialog, DialogBody, DialogTrigger } from "@/ui/Dialog";
import { Label } from "@/ui/Label";
import { Popover } from "@/ui/Popover";
import {
  Slider,
  SliderLabel,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "@/ui/Slider";
import { Tooltip } from "@/ui/Tooltip";

import { overlayColorAtom, overlayOpacityAtom } from "../OverlayStyle";

export const SettingsButton = memo(() => {
  return (
    <DialogTrigger>
      <Tooltip content="Customize overlay color and opacity">
        <Button variant="secondary" iconOnly>
          <PaintbrushIcon />
        </Button>
      </Tooltip>
      <Popover placement="bottom end">
        <OverlaySettingsDialog />
      </Popover>
    </DialogTrigger>
  );
});

function OverlaySettingsDialog() {
  return (
    <Dialog className="w-80 select-none">
      <DialogBody>
        <Heading slot="title" level={2} className="mb-4 font-medium">
          Customize overlay
        </Heading>
        <div className="flex flex-col gap-6">
          <ColorPicker />
          <OpacityPicker />
        </div>
      </DialogBody>
    </Dialog>
  );
}

function OpacityPicker() {
  const [opacity, setOpacity] = useAtom(overlayOpacityAtom);
  return (
    <Slider
      min={50}
      max={100}
      value={opacity * 100}
      onValueChange={(value) => {
        invariant(typeof value === "number", "Opacity must be a number");
        setOpacity(value / 100);
      }}
    >
      <SliderLabel>Opacity</SliderLabel>
      <SliderOutput />
      <SliderTrack>
        <SliderThumb />
      </SliderTrack>
    </Slider>
  );
}

function ColorPicker() {
  const [color, setColor] = useAtom(overlayColorAtom);
  return (
    <div>
      <Label>Color</Label>
      <ColorSwatchPicker value={color} onChange={setColor}>
        <ColorSwatchPickerItem color="#FF5470" />
        <ColorSwatchPickerItem color="#FF007C" />
        <ColorSwatchPickerItem color="#FD3A4A" />
        <ColorSwatchPickerItem color="#FFAA1D" />
        <ColorSwatchPickerItem color="#299617" />
        <ColorSwatchPickerItem color="#2243B6" />
        <ColorSwatchPickerItem color="#5DADEC" />
        <ColorSwatchPickerItem color="#5946B2" />
        <ColorSwatchPickerItem color="#000" />
      </ColorSwatchPicker>
    </div>
  );
}
