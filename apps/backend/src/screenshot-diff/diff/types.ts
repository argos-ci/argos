export type DiffResult = {
  score: number;
  file?: {
    path: string;
    contentType: string;
    width?: number;
    height?: number;
  };
};

export type DiffOptions = {
  /**
   * A threshold between 0 and 1 to adjust the sensitivity of the diff.
   * A lower threshold will result in more differences being detected.
   * @default 0.5
   */
  threshold?: number | undefined;
};
