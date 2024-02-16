const colors = [
  "#2a3b4c",
  "#10418e",
  "#4527a0",
  "#8ca1ee",
  "#65b7d7",
  "#65b793",
  "#00796b",
  "#9c1258",
  "#c20006",
  "#ff3d44",
  "#ffb83d",
  "#f58f00",
];

/**
 * Get a deterministic color based on an id.
 */
export function getAvatarColor(id: string | number): string {
  const randomIndex = Number(id) % colors.length;
  return colors[randomIndex] ?? colors[0] ?? "#000";
}

/**
 * Returns a function that generates a GitHub avatar URL.
 */
export function githubAvatarUrlFactory(login: string) {
  return ({ size }: { size?: number }) => {
    const baseUrl = `https://github.com/${login}.png`;
    if (!size) {
      return baseUrl;
    }
    return `${baseUrl}?size=${size}`;
  };
}
