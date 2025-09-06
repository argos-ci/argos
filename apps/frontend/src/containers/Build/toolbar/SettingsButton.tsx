import { memo } from "react";
import { invariant } from "@argos/util/invariant";
import { useAtom } from "jotai/react";
import { PaintbrushIcon } from "lucide-react";
import { Heading } from "react-aria-components";

import {
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
} from "@/ui/ColorPicker";
import { Dialog, DialogBody, DialogTrigger } from "@/ui/Dialog";
import { IconButton } from "@/ui/IconButton";
import { Label } from "@/ui/Label";
import { Popover } from "@/ui/Popover";
import { Slider, SliderOutput, SliderThumb, SliderTrack } from "@/ui/Slider";
import { Tooltip } from "@/ui/Tooltip";

import { overlayColorAtom, overlayOpacityAtom } from "../OverlayStyle";

export const SettingsButton = memo(() => {
  return (
    <DialogTrigger>
      <Tooltip content="Customize overlay color and opacity">
        <IconButton>
          <PaintbrushIcon />
        </IconButton>
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
      minValue={50}
      maxValue={100}
      value={opacity * 100}
      onChange={(value) => {
        invariant(typeof value === "number", "Opacity must be a number");
        setOpacity(value / 100);
      }}
    >
      <Label>Opacity</Label>
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
      <ColorSwatchPicker
        value={color}
        onChange={(color) => setColor(color.toString("css"))}
      >
        <ColorSwatchPickerItem color="#FF5470">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#FF007C">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#FD3A4A">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#FFAA1D">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#299617">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#2243B6">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#5DADEC">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#5946B2">
          <ColorSwatch />
        </ColorSwatchPickerItem>
        <ColorSwatchPickerItem color="#000">
          <ColorSwatch />
        </ColorSwatchPickerItem>
      </ColorSwatchPicker>
    </div>
  );
}
