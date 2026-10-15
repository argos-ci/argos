// Opens the dev app on a phone: an ngrok tunnel, then the dev server started
// for the tunnel's URL. See CONTRIBUTING.md § Opening the dev app on a phone.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { parseEnv } from "node:util";

/**
 * Read from `.env` without loading the file into this process: everything in
 * it would otherwise reach `pnpm run dev` as if set in the shell.
 */
function getNgrokURL() {
  if (process.env.NGROK_URL) {
    return process.env.NGROK_URL;
  }
  if (!existsSync(".env")) {
    return null;
  }
  return parseEnv(readFileSync(".env", "utf8")).NGROK_URL || null;
}

/** Resolves with the tunnel's public URL once ngrok reports it. */
function openTunnel(ngrokURL) {
  const ngrok = spawn(
    "ngrok",
    [
      "http",
      "https://app.argos-ci.dev:4002",
      // Vite refuses any other host, and the backend mounts its router behind
      // `subdomain(..., "app")`.
      "--host-header=rewrite",
      ...(ngrokURL ? [`--url=${ngrokURL}`] : []),
      "--log=stdout",
      "--log-format=json",
    ],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const url = new Promise((resolve, reject) => {
    // Read to the end, not just up to the URL: a full pipe would stall ngrok.
    createInterface({ input: ngrok.stdout }).on("line", (line) => {
      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        return;
      }
      if (entry.msg === "started tunnel" && entry.url) {
        resolve(entry.url);
      }
    });
    ngrok.on("error", reject);
    // ngrok prints why on stderr, which is the terminal's.
    ngrok.on("exit", () => reject(new Error("see ngrok's error above")));
  });
  return { ngrok, url };
}

const ngrokURL = getNgrokURL();
const { ngrok, url: urlPromise } = openTunnel(ngrokURL);

let url;
try {
  url = await urlPromise;
} catch (error) {
  console.error(`\nCould not open the ngrok tunnel: ${error.message}\n`);
  process.exit(1);
}

console.log(`\nOpen ${url} on your phone, then sign in with an email code.`);
if (!ngrokURL) {
  console.log(
    "This URL changes on every run: set NGROK_URL in .env to your ngrok dev domain to keep it.",
  );
}
console.log("");

const dev = spawn("pnpm", ["run", "dev"], {
  stdio: "inherit",
  // The session cookie is scoped to `.argos-ci.dev`, which the phone rejects
  // on the tunnel's domain, and the SPA sends signed-out visitors to
  // `config.server.url`.
  env: { ...process.env, SERVER_URL: url, SESSION_DOMAIN: "" },
});

// Ctrl+C reaches both through the terminal's process group; this process
// only has to outlive them, and to take the other down when one stops.
let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
dev.on("exit", (code) => {
  stopping = true;
  ngrok.kill();
  process.exit(code ?? 0);
});
ngrok.on("exit", () => {
  if (stopping) {
    return;
  }
  console.error("\nThe ngrok tunnel stopped, stopping the dev server.\n");
  dev.kill("SIGINT");
});
