/**
 * Represents a rectangle with a position and size.
 */
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MessageData = Rect[] | null;

export type MessageInput = {
  url: string;
  blockSize: number;
  exclude: ReadonlyArray<Rect>;
};
