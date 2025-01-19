import { fetchImage } from "../image";
import type { Rect } from "./types";

/**
 * The size of the blocks to use when detecting colored zones.
 */
const BLOCK_SIZE = 5;

// Listens for messages from the main thread and detects colored zones in an image.
self.onmessage = (event) => {
  const url = event.data.url;
  if (typeof url !== "string") {
    throw new Error("Expected url to be a string");
  }
  detectColoredZones({ url })
    .then((rects) => {
      self.postMessage(rects);
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
  const blob = await response.blob();
  const bmp = await createImageBitmap(blob);
  return bmp;
}

/**
 * Detects colored zones in an image.
 */
async function detectColoredZones(input: { url: string }): Promise<Rect[]> {
  const { url } = input;

  // Create an offscreen canvas to draw the image.
  const canvas = new OffscreenCanvas(1, 1);

  // Get the 2d context of the canvas.
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Expected canvas to have a 2d context");
  }

  // Fetch the image and draw it on the canvas.
  const bitmap = await fetchBitmapFromURL(url);
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Get the image data.
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Create a 2d array to store the detected blocks.
  const rows = Math.ceil(canvas.height / BLOCK_SIZE);
  const cols = Math.ceil(canvas.width / BLOCK_SIZE);
  const grid: boolean[][] = Array.from({ length: rows }, () => []);

  /**
   * Checks if a block contains any color.
   */
  const containsColor = (x: number, y: number) => {
    for (let i = y; i < y + BLOCK_SIZE; i++) {
      for (let j = x; j < x + BLOCK_SIZE; j++) {
        const index = (i * canvas.width + j) * 4;
        const red = data[index];

        if (red === 255) {
          return true;
        }
      }
    }
    return false;
  };

  // Fill the grid with the detected blocks.
  for (let y = 0; y < canvas.height; y += BLOCK_SIZE) {
    for (let x = 0; x < canvas.width; x += BLOCK_SIZE) {
      const row = Math.floor(y / BLOCK_SIZE);
      const col = Math.floor(x / BLOCK_SIZE);
      grid[row]![col] = containsColor(x, y);
    }
  }

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
    let minX = col * BLOCK_SIZE;
    let minY = row * BLOCK_SIZE;
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

      const x = col * BLOCK_SIZE;
      const y = row * BLOCK_SIZE;
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
      width: maxX - minX + BLOCK_SIZE,
      height: maxY - minY + BLOCK_SIZE,
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
