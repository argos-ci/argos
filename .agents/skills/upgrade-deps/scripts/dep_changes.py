#!/usr/bin/env python3
"""List the dependency ranges an upgrade changed, grouped as major / minor / patch.

Compares every tracked package.json plus the `catalog` and `overrides` sections
of pnpm-workspace.yaml against a base ref (default origin/main). A 0.x minor
bump counts as major, as semver treats it.

Usage:
  dep_changes.py [--base origin/main] [--markdown]
"""

import argparse
import json
import re
import subprocess

DEP_FIELDS = ("dependencies", "devDependencies", "optionalDependencies")
YAML_SECTIONS = ("catalog", "overrides")


def git(*args):
    return subprocess.run(
        ("git", *args), check=True, capture_output=True, text=True
    ).stdout


def show(ref, path):
    try:
        return git("show", f"{ref}:{path}")
    except subprocess.CalledProcessError:
        return None


def workspace_sections(text):
    """Flat `key: value` entries of top-level YAML sections; enough for pnpm-workspace.yaml."""
    sections, current = {}, None
    for line in (text or "").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        top = re.match(r"^([A-Za-z][\w-]*):\s*$", line)
        if top:
            current = top.group(1) if top.group(1) in YAML_SECTIONS else None
            continue
        if not line.startswith(" "):
            current = None
            continue
        entry = re.match(r"^  (['\"]?)(.+?)\1:\s*(.+?)\s*$", line)
        if current and entry:
            sections.setdefault(current, {})[entry.group(2)] = entry.group(3).strip("'\"")
    return sections


def version_of(spec):
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", spec)
    return tuple(int(x) for x in match.groups()) if match else None


def kind(old, new):
    a, b = version_of(old), version_of(new)
    if not a or not b:
        return "other"
    if a[0] != b[0] or (a[0] == 0 and a[1] != b[1]):
        return "major"
    if a[1] != b[1]:
        return "minor"
    return "patch" if a[2] != b[2] else "other"


def collect(base):
    changes = {}

    def record(where, name, old, new):
        if old == new or old is None or new is None:
            return
        if any(s.startswith(("catalog:", "workspace:")) for s in (old, new)):
            return
        changes.setdefault((name, old, new), []).append(where)

    for path in git("ls-files", "--", "*package.json").split():
        old_text = show(base, path)
        if old_text is None:
            continue
        old, new = json.loads(old_text), json.load(open(path))
        for field in DEP_FIELDS:
            for name, spec in new.get(field, {}).items():
                record(path, name, old.get(field, {}).get(name), spec)

    old_ws = workspace_sections(show(base, "pnpm-workspace.yaml"))
    new_ws = workspace_sections(open("pnpm-workspace.yaml").read())
    for section in YAML_SECTIONS:
        for name, spec in new_ws.get(section, {}).items():
            record(f"pnpm-workspace.yaml {section}", name, old_ws.get(section, {}).get(name), spec)
        for name in old_ws.get(section, {}).keys() - new_ws.get(section, {}).keys():
            print(f"note: {section} entry {name!r} was removed")
    return changes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="origin/main")
    parser.add_argument("--markdown", action="store_true")
    args = parser.parse_args()

    groups = {"major": [], "minor": [], "patch": [], "other": []}
    for (name, old, new), wheres in sorted(collect(args.base).items()):
        groups[kind(old, new)].append((name, old, new, wheres))

    for group, items in groups.items():
        if not items:
            continue
        if args.markdown:
            print(f"**{group.capitalize()}** ({len(items)}): " + ", ".join(
                f"`{name}` {old} → {new}" for name, old, new, _ in items
            ))
            print()
        else:
            print(f"== {group} ({len(items)})")
            for name, old, new, wheres in items:
                print(f"  {name:45} {old:>14} -> {new:<14} {', '.join(wheres)}")


if __name__ == "__main__":
    main()
