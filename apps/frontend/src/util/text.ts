import { atom, useAtomValue } from "jotai";
import { atomFamily } from "jotai/utils";

const textAtomFamily = atomFamily((url: string) =>
  atom(async () => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      return response.text();
    } catch (error) {
      console.error(error);
      return "";
    }
  }),
);

const multipleTextAtom = atomFamily(
  (urls: string[]) =>
    atom(async (get) => {
      return Promise.all(urls.map((url) => get(textAtomFamily(url))));
    }),
  (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
);

export function useTextContent<T extends string[]>(urls: T): T {
  return useAtomValue(multipleTextAtom(urls)) as T;
}
