# Flaky Fix Code Examples

Code examples for each flakiness fix. Load this file when you need to give a developer the exact implementation for a fix identified during build review.

---

## 1. Loaders / async data — `aria-busy`

For SDKs that enable `waitForAriaBusy`, `argosScreenshot()` waits until no
element with `aria-busy` is present or truthy before capturing. Apply it to
loader components in those integrations.

```jsx
// while data is loading
<Loader aria-busy={true} />

// once data is ready, remove the attribute or set to false
<Loader aria-busy={false} />
```

Plain HTML:

```html
<div class="spinner" aria-busy="true"></div>
```

---

## 2. Dynamic dates and times

**Option A — hide the element (preserves layout):**

```html
<time data-visual-test="transparent">10 oct, 2012</time>
```

**Option B — freeze dates in test seeds:**
Run a normalization script before the E2E suite that sets all date fields to a fixed value. This is preferable when the date drives layout (e.g. affects column widths or sort order).

---

## 3. Dynamic content — `data-visual-test` attributes

| Attribute                        | CSS effect              | When to use                                                                |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `data-visual-test="transparent"` | `visibility: hidden`    | Hide content, keep layout space                                            |
| `data-visual-test="removed"`     | `display: none`         | Hide content and collapse layout space                                     |
| `data-visual-test="blackout"`    | Black mask overlay      | Obscure sensitive or dynamic content (Playwright, Cypress, Storybook only) |
| `data-visual-test-no-radius`     | Removes `border-radius` | Fix cross-browser rounding glitches                                        |

```html
<!-- hide a dynamic avatar but preserve its space -->
<img src="..." data-visual-test="transparent" />

<!-- remove an ad entirely -->
<div id="ad-slot" data-visual-test="removed"></div>

<!-- mask a user photo -->
<img src="..." data-visual-test="blackout" />

<!-- fix border-radius rendering differences -->
<button class="rounded-lg" data-visual-test-no-radius>Submit</button>
```

---

## 4. Animations and transitions

The Argos SDK automatically stabilizes CSS animations (pauses them at a consistent frame before capture). For JS-driven animations that are still causing flakiness, hide the element:

```html
<div class="animated-chart" data-visual-test="removed"></div>
```

Or disable the animation in test via CSS injection:

```ts
await argosScreenshot(page, "my-page", {
  argosCSS:
    "*, *::before, *::after { animation: none !important; transition: none !important; }",
});
```

---

## 5. Border-radius glitches

Cross-browser and cross-OS rendering can produce 1px differences around rounded corners. Strip the radius for the screenshot:

```html
<button class="rounded" data-visual-test-no-radius>My button</button>
```

---

## 6. `argosScreenshot` stabilization options (Playwright)

The stabilization behavior can be customized per screenshot:

```ts
await argosScreenshot(page, "name", {
  stabilize: {
    waitForAriaBusy: true, // wait for aria-busy to clear (default: true)
    waitForFonts: true, // wait for fonts to load (default: true)
    waitForImages: true, // wait for images to load (default: true)
    hideScrollbars: true, // hide scrollbars (default: true)
    hideCarets: true, // hide text carets (default: true)
    fontAntialiasing: true, // force consistent font antialiasing (default: true)
    stabilizeSticky: true, // make sticky/fixed elements position:absolute (default: true)
  },
});
```

To debug a specific test by running it multiple times to surface inconsistencies:

```sh
npx playwright test --repeat-each 5
```

## 7. Framework caveat

`aria-busy` is not a universal fix across every Argos integration. For example,
some integrations may disable `waitForAriaBusy` by default, so waiting for
settled content explicitly can be a more portable recommendation than relying
only on `aria-busy`.
