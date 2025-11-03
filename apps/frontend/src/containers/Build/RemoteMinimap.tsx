import { useTextContent } from "@/util/text";

import { TextCanvas, type TextCanvasProps } from "./TextMinimap";

export function RemoteMinimap(
  props: Omit<TextCanvasProps, "text"> & {
    url: string;
  },
) {
  const { url, ...rest } = props;
  const [text] = useTextContent([url]);
  return <TextCanvas text={text} {...rest} />;
}
