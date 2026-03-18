export function parseViewport(value: string) {
  const [width, height] = value.split("×").map(Number);
  if (!width || !height || isNaN(width) || isNaN(height)) {
    throw new Error("Invalid viewport value");
  }
  return { width, height };
}

export function formatViewport(viewport: { width: number; height: number }) {
  return `${viewport.width}×${viewport.height}`;
}
