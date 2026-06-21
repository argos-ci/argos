import { useEffect, useState } from "react";

/**
 * Tracks whether the Alt/Option key is currently held down. Used to offer a
 * modifier-driven secondary action on a button (e.g. flip "Add to review" to
 * "Post comment"). Resets on window blur so a key-up missed while another window
 * was focused doesn't leave it stuck on.
 */
export function useAltKeyHeld(): boolean {
  const [altHeld, setAltHeld] = useState(false);
  useEffect(() => {
    const handleKeyChange = (event: KeyboardEvent) => {
      setAltHeld(event.altKey);
    };
    const reset = () => setAltHeld(false);
    window.addEventListener("keydown", handleKeyChange);
    window.addEventListener("keyup", handleKeyChange);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", handleKeyChange);
      window.removeEventListener("keyup", handleKeyChange);
      window.removeEventListener("blur", reset);
    };
  }, []);
  return altHeld;
}
