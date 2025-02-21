import { fetchImage } from "../image";
import type { MessageData, Rect } from "./types";

// Listens for messages from the main thread and detects colored zones in an image.
self.onmessage = (event) => {
  const { url, blockSize } = event.data;
  if (typeof url !== "string") {
    throw new Error("Expected url to be a string");
  }
  if (typeof blockSize !== "number") {
    throw new Error("Expected blockSize to be a number");
  }
  detectColoredZones({ url, blockSize })
    .then((rects) => {
      self.postMessage(rects satisfies MessageData);
    })
    .catch((error) => {
      setTimeout(() => {
        throw error;
      });
    });
};

/**
 * Fetches a bitmap from a URL.
 */
async function fetchBitmapFromURL(url: string) {
  const response = await fetchImage(url);
  const contentType = response.headers.get("content-type");
  // We only support JPEG images.
  if (contentType !== "image/jpeg") {
    return null;
  }
  const blob = await response.blob();
  const bmp = await createImageBitmap(blob);
  return bmp;
}

/**
 * Detects colored zones in an image.
 */
async function detectColoredZones(input: {
  url: string;
  blockSize: number;
}): Promise<Rect[] | null> {
  const { url, blockSize } = input;

  // Create an offscreen canvas to draw the image.
  const canvas = new OffscreenCanvas(1, 1);

  // Get the 2d context of the canvas.
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Expected canvas to have a 2d context");
  }

  // Fetch the image and draw it on the canvas.
  const bitmap = await fetchBitmapFromURL(url);
  if (!bitmap) {
    return null;
  }
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Get the image data.
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Create a 2d array to store the detected blocks.
  const rows = Math.ceil(canvas.height / blockSize);
  const cols = Math.ceil(canvas.width / blockSize);
  const grid: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false),
  );

  /**
   * Checks if a block contains any color.
   */
  const containsColor = (x: number, y: number) => {
    for (let i = y; i < y + blockSize; i++) {
      for (let j = x; j < x + blockSize; j++) {
        const index = (i * canvas.width + j) * 4;
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        if (red || green || blue) {
          return true;
        }
      }
    }
    return false;
  };

  // Fill the grid with the detected blocks.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * blockSize;
      const y = row * blockSize;
      grid[row]![col] = containsColor(x, y);
    }
  }

  return groupRects(grid, blockSize);
}

function groupRects(grid: boolean[][], blockSize: number): Rect[] {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const groups: Rect[] = [];

  const directions = [
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
  ];

  /**
   * Flood fills a group of blocks and calculates the bounding rectangle.
   */
  const floodFill = (row: number, col: number) => {
    const stack = [{ row, col }];
    let minX = col * blockSize;
    let minY = row * blockSize;
    let maxX = minX;
    let maxY = minY;

    while (stack.length > 0) {
      const { row, col } = stack.pop()!;
      if (
        row < 0 ||
        col < 0 ||
        row >= rows ||
        col >= cols ||
        visited[row]![col] ||
        !grid[row]![col]
      ) {
        continue;
      }
      visited[row]![col] = true;

      const x = col * blockSize;
      const y = row * blockSize;
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x > maxX) {
        maxX = x;
      }
      if (y > maxY) {
        maxY = y;
      }

      for (const { dx, dy } of directions) {
        stack.push({ row: row + dy, col: col + dx });
      }
    }

    groups.push({
      x: minX,
      y: minY,
      width: maxX - minX + blockSize,
      height: maxY - minY + blockSize,
    });
  };

  /**
   * Iterate over each block and find groups.
   */
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row]![col] && !visited[row]![col]) {
        floodFill(row, col);
      }
    }
  }

  return groups;
}
