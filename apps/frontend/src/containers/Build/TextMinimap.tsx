import React, {
  useLayoutEffect,
  useRef,
  type ComponentPropsWithRef,
} from "react";
import { invariant } from "@argos/util/invariant";

export type TextCanvasProps = ComponentPropsWithRef<"canvas"> & {
  text: string;
};

const CONFIG = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: 8,
  lineGap: 3,
  tabSize: 1,
  fg: "#333",
  bg: "#fafafa",
  softWrap: false,
  padding: 8,
};

function renderMinimap(text: string, canvas: HTMLCanvasElement): void {
  const { fontFamily, fontSize, lineGap, tabSize, fg, bg, softWrap, padding } =
    CONFIG;
  function truncateWithEllipsis(s: string, maxCols: number): string {
    if (s.length <= maxCols) {
      return s;
    }
    if (maxCols <= 0) {
      return "";
    }
    if (maxCols === 1) {
      return "…";
    }
    return s.slice(0, maxCols - 1) + "…";
  }
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const cssW = Math.max(1, Math.floor(canvas.clientWidth || 1));
  const cssH = Math.max(1, Math.floor(canvas.clientHeight || 1));
  if (canvas.width !== cssW * dpr) {
    canvas.width = cssW * dpr;
  }
  if (canvas.height !== cssH * dpr) {
    canvas.height = cssH * dpr;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = fg;

  const spaceWidth = ctx.measureText(" ").width || fontSize * 0.6;
  const adv = spaceWidth;
  const lineHeight = Math.ceil(fontSize + lineGap);

  const normalized = text
    .replace(/\t/g, " ".repeat(tabSize))
    .replace(/\r\n?/g, "\n");
  const srcLines = normalized.split("\n");

  const maxCols = Math.max(1, Math.floor((cssW - 2 * padding) / adv));
  const maxRows = Math.max(1, Math.floor((cssH - 2 * padding) / lineHeight));

  const rows: string[] = [];
  outer: for (let i = 0; i < srcLines.length; i++) {
    const line = srcLines[i];
    invariant(line !== undefined);
    if (!softWrap) {
      rows.push(
        line.length > maxCols ? truncateWithEllipsis(line, maxCols) : line,
      );
      if (rows.length >= maxRows) {
        break outer;
      }
      continue;
    }
    let start = 0;
    while (start < line.length) {
      const end = Math.min(line.length, start + maxCols);
      rows.push(line.slice(start, end));
      start = end;
      if (rows.length >= maxRows) {
        break outer;
      }
    }
    if (line.length === 0) {
      rows.push("");
      if (rows.length >= maxRows) {
        break outer;
      }
    }
  }

  const overflow = rows.length > maxRows;
  const drawRows = overflow ? rows.slice(0, Math.max(0, maxRows - 1)) : rows;

  let y = padding;
  for (let i = 0; i < drawRows.length; i++) {
    const row = drawRows[i];
    invariant(row !== undefined);
    ctx.fillText(row, padding, y);
    y += lineHeight;
  }

  if (overflow && maxRows > 0) {
    const marker = "…";
    const w = ctx.measureText(marker).width;
    ctx.fillText(marker, cssW - w - padding, cssH - lineHeight - padding);
  }
}

export function TextCanvas(props: TextCanvasProps) {
  const { text, className, ...rest } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    invariant(canvas, "Canvas ref is null");
    renderMinimap(text, canvas);
  }, [text]);

  return <canvas ref={canvasRef} className={className} {...rest} />;
}
