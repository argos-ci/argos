import { useId } from "react";

import { CopyButton } from "@/ui/CopyButton";
import { Label } from "@/ui/Label";
import { TextInput, TextInputAddon, TextInputGroup } from "@/ui/TextInput";

export function CopyableInputGroup(props: {
  title: React.ReactNode;
  description?: React.ReactNode;
  value: string;
}) {
  const { title, description, value } = props;
  const inputId = useId();
  return (
    <div>
      <Label htmlFor={inputId}>{title}</Label>
      <TextInputGroup className={description ? "mb-2" : undefined}>
        <TextInput id={inputId} readOnly value={value} scale="sm" />
        <TextInputAddon>
          <CopyButton text={value} />
        </TextInputAddon>
      </TextInputGroup>
      {description ? <p className="text-low text-xs">{description}</p> : null}
    </div>
  );
}
