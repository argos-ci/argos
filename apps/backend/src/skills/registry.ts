/**
 * Argos publishes its agent skills from the public `argos-ci/argos-javascript`
 * repo. Both the well-known discovery index (for `npx skills add`) and the MCP
 * resources point at the repo's raw files — the skill content is never copied
 * into the backend, so there is a single source of truth. We track `main`, so
 * an edit to a skill goes live as soon as it merges.
 */
import { parse as parseYaml } from "yaml";

const SKILLS_REPO = "argos-ci/argos-javascript";
const SKILLS_REF = "main";
const SKILLS_ROOT = "skills";

/** Canonical raw content base: `${RAW_BASE}/<name>/<file>`. */
const RAW_BASE = `https://raw.githubusercontent.com/${SKILLS_REPO}/${SKILLS_REF}/${SKILLS_ROOT}`;

/** GitHub tree API — called at most once per cache window to enumerate files. */
const TREE_URL = `https://api.github.com/repos/${SKILLS_REPO}/git/trees/${SKILLS_REF}?recursive=1`;

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface Skill {
  /** Directory name and skill identifier, e.g. `argos-pr-review`. */
  name: string;
  /** One-line summary, from the SKILL.md frontmatter. */
  description: string;
  /**
   * Every installable file, relative to the skill directory, `SKILL.md` first,
   * e.g. `["SKILL.md", "references/baseline.md"]`.
   */
  files: string[];
}

/** Legacy (v0.1.0) discovery index, the digest-free format `npx skills` reads. */
export interface DiscoveryIndex {
  skills: { name: string; description: string; files: string[] }[];
}

interface GitHubTreeResponse {
  tree?: { path: string; type: string }[];
}

let cache: { skills: Skill[]; expiresAt: number } | null = null;
let inflight: Promise<Skill[]> | null = null;

/** Extract `name`/`description` from a SKILL.md YAML frontmatter block. */
function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
} | null {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1];
  if (!block) {
    return null;
  }
  try {
    const data = parseYaml(block) as Record<string, unknown>;
    const name = data["name"];
    const description = data["description"];
    const result: { name?: string; description?: string } = {};
    if (typeof name === "string") {
      result.name = name;
    }
    if (typeof description === "string") {
      result.description = description.trim();
    }
    return result;
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url);
  return response.ok ? response.text() : null;
}

/** Enumerate the skills in the repo and resolve each one's metadata. */
async function loadSkills(): Promise<Skill[]> {
  const response = await fetch(TREE_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(
      `Failed to list Argos skills: GitHub returned ${response.status}`,
    );
  }
  const body = (await response.json()) as GitHubTreeResponse;

  // Group blob paths under `skills/<name>/…` by skill directory.
  const filesByName = new Map<string, string[]>();
  const prefix = `${SKILLS_ROOT}/`;
  for (const entry of body.tree ?? []) {
    if (entry.type !== "blob" || !entry.path.startsWith(prefix)) {
      continue;
    }
    const rest = entry.path.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) {
      continue; // a file directly in skills/, not inside a skill directory
    }
    const name = rest.slice(0, slash);
    const files = filesByName.get(name) ?? [];
    files.push(rest.slice(slash + 1));
    filesByName.set(name, files);
  }

  const resolved = await Promise.all(
    [...filesByName].map(async ([name, files]) => {
      if (!files.some((file) => file.toLowerCase() === "skill.md")) {
        return null;
      }
      const content = await fetchText(`${RAW_BASE}/${name}/SKILL.md`);
      const frontmatter = content ? parseFrontmatter(content) : null;
      if (!frontmatter?.description) {
        return null;
      }
      // SKILL.md first, then the remaining files in a stable order.
      const rest = files
        .filter((file) => file.toLowerCase() !== "skill.md")
        .sort();
      return {
        name,
        description: frontmatter.description,
        files: ["SKILL.md", ...rest],
      } satisfies Skill;
    }),
  );

  return resolved
    .filter((skill): skill is Skill => skill !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Return the published skills, cached in-memory with a TTL. On a refresh
 * failure the last good value is served (stale-while-error) so the public
 * well-known endpoint never breaks because of a transient GitHub hiccup.
 */
export async function getSkills(): Promise<Skill[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.skills;
  }
  inflight ??= loadSkills()
    .then((skills) => {
      cache = { skills, expiresAt: Date.now() + CACHE_TTL };
      return skills;
    })
    .catch((error: unknown) => {
      if (cache) {
        return cache.skills; // serve stale on error
      }
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Build the legacy (v0.1.0) discovery index served at `.../index.json`. */
export function buildDiscoveryIndex(skills: Skill[]): DiscoveryIndex {
  return {
    skills: skills.map(({ name, description, files }) => ({
      name,
      description,
      files,
    })),
  };
}

/** The canonical raw content URL for a skill file. */
export function getSkillFileUrl(name: string, file: string): string {
  return `${RAW_BASE}/${name}/${file}`;
}

/** Reset the in-memory cache. Test-only. */
export function resetSkillsCache(): void {
  cache = null;
  inflight = null;
}
