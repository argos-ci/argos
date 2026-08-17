/**
 * Which device the user last reached for, published on the root element as
 * `data-focus-modality`. Call {@link trackFocusModality} once, from the entry
 * point.
 *
 * `:focus-visible` answers "should this draw a focus ring?" for buttons, links
 * and every other control — but not for text fields. The browser matches a
 * focused text input on a plain click too, on the reasoning that typing is
 * coming either way, so a field that wants a ring only when it was reached by
 * keyboard cannot ask CSS: it has to know how focus arrived. That is what
 * react-aria's modality tracking was doing, and this is what replaces it.
 *
 * Read it through the `kbd-focus` variant, and only from `ui/TextInput` —
 * everything else is served by `:focus-visible`.
 */

type Modality = "keyboard" | "pointer";

/**
 * A chord is a command, not navigation: Cmd-R reloads, it does not move focus,
 * so it must not flip the page into keyboard modality. Nor may a lone
 * modifier, which is only ever the first half of one.
 */
function isNavigationKey(event: KeyboardEvent): boolean {
  return !(
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.key === "Meta" ||
    event.key === "Control" ||
    event.key === "Alt" ||
    event.key === "Shift"
  );
}

function setModality(modality: Modality): void {
  if (document.documentElement.dataset["focusModality"] === modality) {
    return;
  }
  document.documentElement.dataset["focusModality"] = modality;
}

let tracking = false;

/**
 * Start publishing the modality. Idempotent.
 *
 * Called rather than imported for its side effect: the frontend package
 * declares `"sideEffects": false`, so a bare `import "./focus-modality"` is
 * dropped from the production bundle — which cost text inputs their keyboard
 * ring, silently, everywhere except Storybook.
 */
export function trackFocusModality(): void {
  if (tracking) {
    return;
  }
  tracking = true;
  setModality("pointer");
  // Capture phase, so a handler that stops propagation cannot leave the page
  // wrong about how the user is driving it.
  document.addEventListener(
    "keydown",
    (event) => {
      if (isNavigationKey(event)) {
        setModality("keyboard");
      }
    },
    true,
  );
  document.addEventListener("pointerdown", () => setModality("pointer"), true);
}
