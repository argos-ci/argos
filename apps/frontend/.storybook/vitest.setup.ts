import "@storybook/addon-vitest/internal/setup-file-with-project-annotations";
import "@storybook/addon-vitest/internal/setup-file";
import "@argos-ci/storybook/internal/vitest-setup-file";

declare global {
  /** Read by Base UI: don't wait for animations before unmounting popups. */
  // oxlint-disable-next-line no-var -- `var` is how a `globalThis` field is declared.
  var BASE_UI_ANIMATIONS_DISABLED: boolean;
}

globalThis.BASE_UI_ANIMATIONS_DISABLED = true;

// A play can run a whole story — mount, interactions, assertions — without the
// browser ever painting a frame, most reliably on a loaded CI machine. An
// entrance animation is then still on its first frame, the popup it drives
// still computes `opacity: 0`, and `toBeVisible()` calls everything inside it
// invisible. The animations are a product nicety, not something these tests
// assert, so the runner turns them off and every story renders settled — which
// is also the state the Argos screenshots mean to capture.
const style = document.createElement("style");
style.textContent =
  "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }";
document.head.append(style);

// That rule only reaches CSS. `Loader` spins with an SVG SMIL
// `<animateTransform>`, which runs on its `<svg>`'s own clock: Argos's
// stabilization and Playwright's `animations: "disabled"` leave it running
// too, so each screenshot caught the spinner on whichever of its twelve steps
// it had reached. Every `<svg>` is held on its first frame as it is inserted,
// because Argos renders each story afresh for its capture.
new MutationObserver((records) => {
  const svgs = records
    .flatMap((record) => [...record.addedNodes])
    .filter((node) => node instanceof Element)
    .flatMap((element) => [element, ...element.querySelectorAll("svg")])
    .filter((element) => element instanceof SVGSVGElement);
  for (const svg of svgs) {
    svg.pauseAnimations();
    svg.setCurrentTime(0);
  }
}).observe(document, { childList: true, subtree: true });
