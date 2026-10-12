#!/usr/bin/env python3
"""Check every open Dependabot alert against the versions pnpm-lock.yaml locks.

Usage:
  dependabot_alerts.py                     # status table, exit 1 if any alert is still vulnerable
  dependabot_alerts.py --markdown          # PR-ready table (alert links, old -> new versions)
  dependabot_alerts.py --base origin/main  # ref whose lockfile gives the "vulnerable" column

Needs `gh` authenticated with access to the repository's Dependabot alerts.
"""

import argparse
import json
import re
import subprocess
import sys

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
LOCK_KEY = re.compile(
    r"^  '?((?:@[^@\s'/]+/)?[^@\s'/]+)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)[(:']",
    re.M,
)


def run(*cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def locked_versions(lockfile_text):
    versions = {}
    for name, version in LOCK_KEY.findall(lockfile_text):
        versions.setdefault(name, set()).add(version)
    return versions


def version_key(version):
    core, _, pre = version.partition("-")
    parts = [int(x) for x in core.split(".")[:3]]
    parts += [0] * (3 - len(parts))
    # A prerelease sorts below its release.
    return (*parts, 0 if pre else 1, pre)


def in_range(version, vulnerable_range):
    """`vulnerable_range` is GitHub's comma-separated comparators, e.g. ">= 1.8.4, < 1.11.0"."""
    v = version_key(version)
    for comparator in vulnerable_range.split(","):
        match = re.fullmatch(r"\s*(>=|<=|>|<|=)?\s*(\S+)\s*", comparator)
        if not match:
            raise ValueError(f"Unparsed range: {vulnerable_range!r}")
        op, bound = match.group(1) or "=", version_key(match.group(2))
        ok = {
            ">=": v >= bound,
            "<=": v <= bound,
            ">": v > bound,
            "<": v < bound,
            "=": v == bound,
        }[op]
        if not ok:
            return False
    return True


def fetch_alerts(repo):
    out = run(
        "gh",
        "api",
        "--paginate",
        f"repos/{repo}/dependabot/alerts?state=open&per_page=100",
        "--jq",
        ".[]",
    )
    alerts = [json.loads(line) for line in out.splitlines() if line.strip()]
    return [a for a in alerts if a["dependency"]["package"]["ecosystem"] == "npm"]


def sort_versions(versions):
    return sorted(versions, key=version_key)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", help="owner/name (default: the current gh repo)")
    parser.add_argument("--lockfile", default="pnpm-lock.yaml")
    parser.add_argument(
        "--base",
        default="origin/main",
        help="git ref whose lockfile shows the versions that were vulnerable",
    )
    parser.add_argument("--markdown", action="store_true")
    args = parser.parse_args()

    repo = args.repo or run(
        "gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"
    ).strip()
    with open(args.lockfile) as f:
        current = locked_versions(f.read())
    try:
        base = locked_versions(run("git", "show", f"{args.base}:{args.lockfile}"))
    except subprocess.CalledProcessError:
        base = {}

    rows = []
    for alert in fetch_alerts(repo):
        name = alert["dependency"]["package"]["name"]
        vuln = alert["security_vulnerability"]
        vulnerable_range = vuln["vulnerable_version_range"]
        patched = (vuln.get("first_patched_version") or {}).get("identifier", "none")
        now = sort_versions(current.get(name, set()))
        was = [v for v in sort_versions(base.get(name, set())) if in_range(v, vulnerable_range)]
        still = [v for v in now if in_range(v, vulnerable_range)]
        if still:
            status = "VULNERABLE"
        elif not now:
            status = "NOT LOCKED"
        else:
            status = "FIXED"
        rows.append(
            {
                "number": alert["number"],
                "severity": alert["security_advisory"]["severity"],
                "name": name,
                "relationship": alert["dependency"].get("relationship") or "?",
                "summary": alert["security_advisory"]["summary"],
                "range": vulnerable_range,
                "patched": patched,
                "was": was,
                "now": now,
                "still": still,
                "status": status,
                "url": alert["html_url"],
            }
        )
    rows.sort(key=lambda r: (SEVERITY_ORDER.get(r["severity"], 9), r["name"], r["number"]))

    if args.markdown:
        print("| Alert | Severity | Package | Issue | Vulnerable | Now locked |")
        print("| --- | --- | --- | --- | --- | --- |")
        for r in rows:
            summary = r["summary"].replace("|", "\\|")
            was = ", ".join(r["was"]) or r["range"]
            now = ", ".join(r["now"]) or "removed"
            print(
                f"| [#{r['number']}]({r['url']}) | {r['severity']} | `{r['name']}` "
                f"| {summary} | {was} | {now} |"
            )
    else:
        for r in rows:
            detail = ", ".join(r["still"] or r["now"]) or "-"
            print(
                f"{r['status']:10} #{r['number']:<5} {r['severity']:8} {r['name']:40} "
                f"vulnerable {r['range']:24} patched>={r['patched']:10} "
                f"locked {detail} ({r['relationship']})"
            )
        print(f"\n{len(rows)} open alerts, "
              f"{sum(r['status'] == 'VULNERABLE' for r in rows)} still vulnerable")

    return 1 if any(r["status"] == "VULNERABLE" for r in rows) else 0


if __name__ == "__main__":
    sys.exit(main())
