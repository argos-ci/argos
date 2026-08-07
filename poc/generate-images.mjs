/**
 * Generates the demo screenshots for the Flows POC: a fake "Atelier" shop
 * checkout + signup funnel, v2 variants for the changed steps, and the diff
 * masks. Run from apps/backend so sharp resolves:
 *
 *   cd apps/backend && node ../../poc/generate-images.mjs
 */
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  new URL("../apps/backend/package.json", import.meta.url),
);
const sharp = require("sharp");

const OUT = join(dirname(fileURLToPath(import.meta.url)), "images");
await mkdir(OUT, { recursive: true });

const W = 1280;
const H = 832;
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const INK = "#18181b";
const MUTED = "#71717a";
const FAINT = "#a1a1aa";
const LINE = "#e4e4e7";
const BG = "#ffffff";
const SUBTLE = "#fafafa";
const ACCENT = "#6e56cf";
const GREEN = "#2f9e68";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function text(
  x,
  y,
  s,
  { size = 15, color = INK, weight = 400, anchor = "start", spacing } = {},
) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}"${spacing ? ` letter-spacing="${spacing}"` : ""}>${esc(s)}</text>`;
}

function rect(x, y, w, h, { fill = "none", stroke, rx = 0, sw = 1 } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""} rx="${rx}"/>`;
}

function button(x, y, w, label, { fill = INK, color = "#fff" } = {}) {
  return (
    rect(x, y, w, 46, { fill, rx: 8 }) +
    text(x + w / 2, y + 29, label, {
      size: 15,
      color,
      weight: 600,
      anchor: "middle",
    })
  );
}

function input(x, y, w, label, value, { h = 44 } = {}) {
  return (
    text(x, y + 6, label.toUpperCase(), {
      size: 10.5,
      color: MUTED,
      weight: 600,
      spacing: 0.8,
    }) +
    rect(x, y + 14, w, h, { fill: BG, stroke: LINE, rx: 8 }) +
    (value
      ? text(x + 14, y + 14 + h / 2 + 5, value, { size: 14, color: INK })
      : "")
  );
}

function nav() {
  return (
    rect(0, 0, W, 64, { fill: BG }) +
    `<line x1="0" y1="64.5" x2="${W}" y2="64.5" stroke="${LINE}"/>` +
    text(48, 40, "Atelier", { size: 20, weight: 700, spacing: -0.3 }) +
    text(W - 248, 39, "Shop", { size: 14, color: MUTED }) +
    text(W - 188, 39, "Journal", { size: 14, color: MUTED }) +
    text(W - 108, 39, "Cart (2)", { size: 14, weight: 600 })
  );
}

const CHECKOUT_STEPS = ["Cart", "Shipping", "Payment", "Review"];
function stepper(active) {
  const x0 = 448;
  return CHECKOUT_STEPS.map((label, i) => {
    const x = x0 + i * 108;
    const isActive = i === active;
    const done = i < active;
    return (
      `<circle cx="${x}" cy="112" r="3.5" fill="${done ? GREEN : isActive ? INK : LINE}"/>` +
      text(x + 12, 117, label, {
        size: 13,
        color: isActive ? INK : done ? MUTED : FAINT,
        weight: isActive ? 600 : 400,
      })
    );
  }).join("");
}

function page(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${rect(0, 0, W, H, { fill: BG })}${body}</svg>`;
}

const CX = 400; // checkout column left
const CW = 480; // checkout column width

function productRow(y, name, detail, price, tone) {
  return (
    rect(CX, y, 64, 64, { fill: tone, rx: 10 }) +
    text(CX + 84, y + 26, name, { size: 15, weight: 600 }) +
    text(CX + 84, y + 47, detail, { size: 13, color: MUTED }) +
    text(CX + CW, y + 26, price, { size: 15, weight: 600, anchor: "end" })
  );
}

function summary(y, rows) {
  let out = rect(CX, y, CW, 24 + rows.length * 30, { fill: SUBTLE, rx: 10 });
  rows.forEach(([label, value, strong], i) => {
    const ry = y + 32 + i * 30;
    out += text(CX + 20, ry, label, {
      size: 14,
      color: strong ? INK : MUTED,
      weight: strong ? 700 : 400,
    });
    out += text(CX + CW - 20, ry, value, {
      size: 14,
      color: INK,
      weight: strong ? 700 : 500,
      anchor: "end",
    });
  });
  return out;
}

/* ---------- Checkout screens ---------- */

const cart = page(
  nav() +
    stepper(0) +
    text(CX, 188, "Your cart", { size: 28, weight: 700, spacing: -0.5 }) +
    productRow(
      232,
      "Ceramic pour-over set",
      "Sand · One size",
      "$64.00",
      "#e7dfd5",
    ) +
    productRow(316, "Linen apron", "Charcoal · M", "$38.00", "#d7dbe0") +
    `<line x1="${CX}" y1="404" x2="${CX + CW}" y2="404" stroke="${LINE}"/>` +
    summary(428, [
      ["Subtotal", "$102.00"],
      ["Shipping", "Free"],
      ["Total", "$102.00", true],
    ]) +
    button(CX, 566, CW, "Continue to shipping") +
    text(CX + CW / 2, 646, "Free returns within 30 days", {
      size: 12.5,
      color: FAINT,
      anchor: "middle",
    }),
);

const shipping = page(
  nav() +
    stepper(1) +
    text(CX, 188, "Shipping address", {
      size: 28,
      weight: 700,
      spacing: -0.5,
    }) +
    input(CX, 224, 232, "First name", "Léa") +
    input(CX + 248, 224, 232, "Last name", "Marchand") +
    input(CX, 308, CW, "Address", "12 rue des Ateliers") +
    input(CX, 392, 232, "City", "Paris") +
    input(CX + 248, 392, 110, "ZIP", "75011") +
    input(CX + 370, 392, 110, "Country", "FR") +
    input(CX, 476, CW, "Email", "lea@example.com") +
    button(CX, 584, CW, "Continue to payment"),
);

function paymentMethod(y, label, selected, note) {
  return (
    rect(CX, y, CW, 56, {
      fill: selected ? SUBTLE : BG,
      stroke: selected ? INK : LINE,
      rx: 10,
      sw: selected ? 1.5 : 1,
    }) +
    `<circle cx="${CX + 28}" cy="${y + 28}" r="8" fill="none" stroke="${selected ? INK : LINE}" stroke-width="1.5"/>` +
    (selected
      ? `<circle cx="${CX + 28}" cy="${y + 28}" r="4" fill="${INK}"/>`
      : "") +
    text(CX + 52, y + 33, label, { size: 14.5, weight: selected ? 600 : 400 }) +
    (note
      ? text(CX + CW - 20, y + 33, note, {
          size: 13,
          color: MUTED,
          anchor: "end",
        })
      : "")
  );
}

function paymentScreen(v2) {
  let y = 224;
  let out =
    nav() +
    stepper(2) +
    text(CX, 188, "Payment", { size: 28, weight: 700, spacing: -0.5 });
  out += paymentMethod(y, "Card", true, "Visa, Mastercard, Amex");
  y += 68;
  out += paymentMethod(y, "PayPal", false);
  y += 68;
  if (v2) {
    out += paymentMethod(y, "Apple Pay", false, "New");
    y += 68;
  }
  y += 8;
  out += input(CX, y, CW, "Card number", "4242 4242 4242 4242");
  y += 84;
  out +=
    input(CX, y, 232, "Expiry", "08 / 29") +
    input(CX + 248, y, 232, "CVC", "•••");
  y += 96;
  out += button(CX, y, CW, "Pay $102.00", v2 ? { fill: ACCENT } : {});
  y += 62;
  out += text(CX + CW / 2, y, "Payments are encrypted and secure", {
    size: 12.5,
    color: FAINT,
    anchor: "middle",
  });
  return page(out);
}

const review = page(
  nav() +
    stepper(3) +
    text(CX, 188, "Review your order", {
      size: 28,
      weight: 700,
      spacing: -0.5,
    }) +
    productRow(
      224,
      "Ceramic pour-over set",
      "Sand · One size",
      "$64.00",
      "#e7dfd5",
    ) +
    productRow(300, "Linen apron", "Charcoal · M", "$38.00", "#d7dbe0") +
    rect(CX, 388, CW, 76, { fill: SUBTLE, rx: 10 }) +
    text(CX + 20, 418, "Ship to", {
      size: 12,
      color: MUTED,
      weight: 600,
      spacing: 0.5,
    }) +
    text(CX + 20, 442, "Léa Marchand · 12 rue des Ateliers, 75011 Paris", {
      size: 14,
    }) +
    summary(488, [["Total", "$102.00", true]]) +
    button(CX, 566, CW, "Place order"),
);

function confirmationScreen(v2) {
  const cy = 300;
  let out =
    nav() +
    `<circle cx="${W / 2}" cy="${cy}" r="36" fill="none" stroke="${GREEN}" stroke-width="2.5"/>` +
    `<path d="M ${W / 2 - 14} ${cy} l 10 11 l 19 -21" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
    text(W / 2, cy + 88, "Thank you, Léa", {
      size: 30,
      weight: 700,
      anchor: "middle",
      spacing: -0.5,
    }) +
    text(W / 2, cy + 122, "Your order #2841 is confirmed.", {
      size: 15.5,
      color: MUTED,
      anchor: "middle",
    });
  let y = cy + 148;
  if (v2) {
    out += text(
      W / 2,
      y + 8,
      "Arrives Thursday, August 13 — we'll email you the tracking.",
      { size: 14.5, color: GREEN, weight: 600, anchor: "middle" },
    );
    y += 44;
  } else {
    y += 24;
  }
  out += button(
    W / 2 - 130,
    y,
    260,
    "Track your order",
    v2 ? { fill: ACCENT } : {},
  );
  return page(out);
}

/* ---------- Signup screens ---------- */

function card(body, h = 420) {
  const cx = W / 2 - 220;
  const cy = (H - h) / 2 + 20;
  return (
    rect(0, 0, W, H, { fill: SUBTLE }) +
    text(W / 2, 128, "Atelier", {
      size: 22,
      weight: 700,
      anchor: "middle",
      spacing: -0.3,
    }) +
    rect(cx, cy, 440, h, { fill: BG, stroke: LINE, rx: 14 }) +
    body(cx + 40, cy + 40)
  );
}

const signupAccount = page(
  card(
    (x, y) =>
      text(x, y + 12, "Create your account", {
        size: 22,
        weight: 700,
        spacing: -0.4,
      }) +
      text(x, y + 38, "Start collecting objects made to last.", {
        size: 13.5,
        color: MUTED,
      }) +
      input(x, y + 66, 360, "Email", "lea@example.com") +
      input(x, y + 150, 360, "Password", "••••••••••") +
      button(x, y + 244, 360, "Create account") +
      text(x + 180, y + 320, "Already have an account? Sign in", {
        size: 13,
        color: MUTED,
        anchor: "middle",
      }),
  ),
);

const signupVerify = page(
  card((x, y) => {
    let out =
      text(x, y + 12, "Check your inbox", {
        size: 22,
        weight: 700,
        spacing: -0.4,
      }) +
      text(x, y + 38, "We sent a 6-digit code to lea@example.com.", {
        size: 13.5,
        color: MUTED,
      });
    for (let i = 0; i < 6; i++) {
      out += rect(x + i * 62, y + 70, 50, 58, {
        fill: BG,
        stroke: i < 3 ? INK : LINE,
        rx: 8,
        sw: i < 3 ? 1.5 : 1,
      });
      if (i < 3) {
        out += text(x + i * 62 + 25, y + 108, String([7, 4, 2][i]), {
          size: 22,
          weight: 600,
          anchor: "middle",
        });
      }
    }
    return (
      out +
      button(x, y + 168, 360, "Verify email") +
      text(x + 180, y + 246, "Resend code", {
        size: 13,
        color: MUTED,
        anchor: "middle",
      })
    );
  }, 340),
);

const signupWelcome = page(
  card(
    (x, y) =>
      `<circle cx="${x + 180}" cy="${y + 40}" r="30" fill="#ede9fe"/>` +
      text(x + 180, y + 48, "L", {
        size: 24,
        weight: 700,
        color: ACCENT,
        anchor: "middle",
      }) +
      text(x + 180, y + 116, "Welcome, Léa", {
        size: 22,
        weight: 700,
        anchor: "middle",
        spacing: -0.4,
      }) +
      text(x + 180, y + 142, "Your account is ready.", {
        size: 13.5,
        color: MUTED,
        anchor: "middle",
      }) +
      button(x, y + 180, 360, "Start shopping") +
      text(x + 180, y + 258, "Explore the fall collection", {
        size: 13,
        color: MUTED,
        anchor: "middle",
      }),
    360,
  ),
);

/* ---------- Signup screens — mobile variants (414×832) ---------- */

const MW = 414;
const MH = 832;

function mobilePage(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MW}" height="${MH}" viewBox="0 0 ${MW} ${MH}">${rect(0, 0, MW, MH, { fill: SUBTLE })}${body}</svg>`;
}

function mobileCard(body, h) {
  const cx = 22;
  const cy = (MH - h) / 2;
  return (
    text(MW / 2, 84, "Atelier", {
      size: 19,
      weight: 700,
      anchor: "middle",
      spacing: -0.3,
    }) +
    rect(cx, cy, MW - 44, h, { fill: BG, stroke: LINE, rx: 14 }) +
    body(cx + 20, cy + 32)
  );
}

const signupAccountMobile = mobilePage(
  mobileCard(
    (x, y) =>
      text(x, y + 10, "Create your account", {
        size: 19,
        weight: 700,
        spacing: -0.4,
      }) +
      text(x, y + 34, "Start collecting objects made to last.", {
        size: 12.5,
        color: MUTED,
      }) +
      input(x, y + 58, 330, "Email", "lea@example.com") +
      input(x, y + 140, 330, "Password", "••••••••••") +
      button(x, y + 230, 330, "Create account") +
      text(x + 165, y + 304, "Already have an account? Sign in", {
        size: 12,
        color: MUTED,
        anchor: "middle",
      }),
    380,
  ),
);

const signupVerifyMobile = mobilePage(
  mobileCard((x, y) => {
    let out =
      text(x, y + 10, "Check your inbox", {
        size: 19,
        weight: 700,
        spacing: -0.4,
      }) +
      text(x, y + 34, "We sent a 6-digit code.", { size: 12.5, color: MUTED });
    for (let i = 0; i < 6; i++) {
      out += rect(x + i * 56, y + 58, 46, 54, {
        fill: BG,
        stroke: i < 3 ? INK : LINE,
        rx: 8,
        sw: i < 3 ? 1.5 : 1,
      });
      if (i < 3) {
        out += text(x + i * 56 + 23, y + 93, String([7, 4, 2][i]), {
          size: 20,
          weight: 600,
          anchor: "middle",
        });
      }
    }
    return (
      out +
      button(x, y + 140, 330, "Verify email") +
      text(x + 165, y + 212, "Resend code", {
        size: 12,
        color: MUTED,
        anchor: "middle",
      })
    );
  }, 300),
);

const signupWelcomeMobile = mobilePage(
  mobileCard(
    (x, y) =>
      `<circle cx="${x + 165}" cy="${y + 36}" r="28" fill="#ede9fe"/>` +
      text(x + 165, y + 44, "L", {
        size: 22,
        weight: 700,
        color: ACCENT,
        anchor: "middle",
      }) +
      text(x + 165, y + 104, "Welcome, Léa", {
        size: 19,
        weight: 700,
        anchor: "middle",
        spacing: -0.4,
      }) +
      text(x + 165, y + 128, "Your account is ready.", {
        size: 12.5,
        color: MUTED,
        anchor: "middle",
      }) +
      button(x, y + 162, 330, "Start shopping") +
      text(x + 165, y + 232, "Explore the fall collection", {
        size: 12,
        color: MUTED,
        anchor: "middle",
      }),
    320,
  ),
);

/* ---------- Standalone screen (no flow) ---------- */

const settings = page(
  nav() +
    text(48, 132, "Account settings", {
      size: 24,
      weight: 700,
      spacing: -0.4,
    }) +
    ["Profile", "Addresses", "Notifications", "Privacy"]
      .map((s, i) =>
        text(48, 190 + i * 40, s, {
          size: 14.5,
          color: i === 2 ? INK : MUTED,
          weight: i === 2 ? 600 : 400,
        }),
      )
      .join("") +
    `<line x1="280" y1="100" x2="280" y2="${H - 48}" stroke="${LINE}"/>` +
    text(340, 190, "Notifications", { size: 19, weight: 700 }) +
    [
      ["Order updates", "Shipping, delivery and returns", true],
      ["New arrivals", "A short weekly note, no noise", true],
      ["Restock alerts", "Only for items you saved", false],
    ]
      .map(([label, detail, on], i) => {
        const y = 232 + i * 84;
        return (
          text(340, y + 22, label, { size: 15, weight: 600 }) +
          text(340, y + 44, detail, { size: 13, color: MUTED }) +
          rect(880, y + 12, 44, 24, { fill: on ? INK : LINE, rx: 12 }) +
          `<circle cx="${on ? 880 + 32 : 880 + 12}" cy="${y + 24}" r="9" fill="#fff"/>`
        );
      })
      .join(""),
);

/* ---------- Diff masks (red regions on transparency) ---------- */

const MASK_RED = "rgba(240,62,62,0.6)";
function mask(regions) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${regions
    .map(
      ([x, y, w, h]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${MASK_RED}"/>`,
    )
    .join("")}</svg>`;
}

// Payment v2: Apple Pay row inserted at y=360, everything below shifted by 68.
const paymentMask = mask([
  [CX, 360, CW, 56],
  [CX, 436, CW, 300],
]);
// Confirmation v2: estimate line + recolored button.
const confirmationMask = mask([
  [W / 2 - 240, 436, 480, 26],
  [W / 2 - 130, 492, 260, 46],
]);

/* ---------- Render ---------- */

const files = {
  "flowpoc-checkout-cart.png": cart,
  "flowpoc-checkout-shipping.png": shipping,
  "flowpoc-checkout-payment.png": paymentScreen(false),
  "flowpoc-checkout-payment-v2.png": paymentScreen(true),
  "flowpoc-checkout-review.png": review,
  "flowpoc-checkout-confirmation.png": confirmationScreen(false),
  "flowpoc-checkout-confirmation-v2.png": confirmationScreen(true),
  "flowpoc-signup-account.png": signupAccount,
  "flowpoc-signup-verify.png": signupVerify,
  "flowpoc-signup-welcome.png": signupWelcome,
  "flowpoc-signup-account-vw414.png": signupAccountMobile,
  "flowpoc-signup-verify-vw414.png": signupVerifyMobile,
  "flowpoc-signup-welcome-vw414.png": signupWelcomeMobile,
  "flowpoc-settings.png": settings,
  "flowpoc-diff-payment.png": paymentMask,
  "flowpoc-diff-confirmation.png": confirmationMask,
};

for (const [name, svg] of Object.entries(files)) {
  await sharp(Buffer.from(svg)).png().toFile(join(OUT, name));
  console.log("wrote", name);
}
