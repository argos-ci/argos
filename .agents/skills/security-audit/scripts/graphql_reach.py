#!/usr/bin/env python3
"""List the GraphQL fields that hand out an object type.

A GraphQL resolver that returns an object lends that object every field its
type defines. Authorization written on the way in (a root query that checks
access) protects nothing once another field returns the same type without
that check. So each type's sensitive fields have to guard themselves, and an
audit has to know every path that reaches a type.

    graphql_reach.py                # every type: how many fields hand it out, shortest path from a root
    graphql_reach.py User Project   # every field that hands out these types, with a path from a root to each

Reads apps/backend/src/graphql/__generated__/schema.gql, which
`pnpm run codegen` writes. Connection, edge and payload wrappers are folded
into the field that returns them, so `Team.members` reads as one edge to
`TeamMember`, not two. A field returning an interface also reaches each type
implementing it, shown as `Project.account (Account)`.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import deque
from pathlib import Path

SCHEMA = Path("apps/backend/src/graphql/__generated__/schema.gql")
ROOTS = ("Query", "Mutation", "Subscription")
WRAPPER_SUFFIXES = ("Connection", "Edge", "Payload")


def strip_noise(sdl: str) -> str:
    sdl = re.sub(r'"""[\s\S]*?"""', "", sdl)
    sdl = re.sub(r'"(?:[^"\\\n]|\\.)*"', '""', sdl)
    sdl = re.sub(r"#[^\n]*", "", sdl)
    # Field arguments, directive arguments and default values.
    while True:
        stripped = re.sub(r"\([^()]*\)", "", sdl)
        if stripped == sdl:
            return re.sub(r"@\w+", "", sdl)
        sdl = stripped


def parse(sdl: str):
    """Return (fields, implementations, unions).

    fields: type name -> list of (field name, named return type)
    implementations: interface name -> implementing type names
    unions: union name -> member type names
    """
    sdl = strip_noise(sdl)
    fields: dict[str, list[tuple[str, str]]] = {}
    implementations: dict[str, list[str]] = {}
    unions: dict[str, list[str]] = {}

    block = re.compile(
        r"\b(?:extend\s+)?(type|interface)\s+(\w+)([^{]*)\{([^}]*)\}", re.S
    )
    for kind, name, head, body in block.findall(sdl):
        implemented = re.search(r"implements\s+([\w\s&]+)", head)
        if implemented:
            for interface in re.findall(r"\w+", implemented.group(1)):
                implementations.setdefault(interface, []).append(name)
        entries = fields.setdefault(name, [])
        for field, return_type in re.findall(r"(\w+)\s*:\s*([\[\]\w!]+)", body):
            entries.append((field, re.sub(r"[\[\]!]", "", return_type)))

    for name, members in re.findall(r"\bunion\s+(\w+)\s*=\s*([\w\s|]+)", sdl):
        unions[name] = re.findall(r"\w+", members)

    return fields, implementations, unions


class Graph:
    def __init__(self, sdl: str):
        self.fields, self.implementations, self.unions = parse(sdl)
        # target type -> [(parent type, field, via abstract type or None)]
        self.in_edges: dict[str, list[tuple[str, str, str | None]]] = {}
        for parent, entries in self.fields.items():
            for field, target in entries:
                for concrete, via in self.expand(target):
                    self.in_edges.setdefault(concrete, []).append((parent, field, via))

    def expand(self, target: str):
        if target not in self.fields and target not in self.unions:
            return  # scalar, enum or input
        yield target, None
        for member in self.unions.get(target, []) + self.implementations.get(
            target, []
        ):
            yield member, target

    @staticmethod
    def is_wrapper(name: str) -> bool:
        return name.endswith(WRAPPER_SUFFIXES) or name == "PageInfo"

    def shortest_paths(self):
        """BFS from the root fields. Returns type -> (previous type, field, via).

        Query goes first, so a type readable through a query is shown with that
        path even when a mutation payload reaches it in fewer steps.
        """
        previous: dict[str, tuple[str, str, str | None] | None] = {}
        for root in ROOTS:
            if root not in self.fields:
                continue
            previous[root] = None
            queue: deque[str] = deque([root])
            while queue:
                parent = queue.popleft()
                for field, target in self.fields.get(parent, []):
                    for concrete, via in self.expand(target):
                        if concrete not in previous:
                            previous[concrete] = (parent, field, via)
                            queue.append(concrete)
        return previous

    def folded_in_edges(self, target: str):
        """In-edges with wrapper types folded into the field returning them."""
        seen = set()
        stack = [(edge, "") for edge in self.in_edges.get(target, [])]
        while stack:
            (parent, field, via), suffix = stack.pop()
            label = f"{field}{suffix}"
            if self.is_wrapper(parent) and parent not in ROOTS:
                for outer in self.in_edges.get(parent, []):
                    if (outer, label) not in seen:
                        seen.add((outer, label))
                        stack.append((outer, f".{label}"))
                continue
            yield parent, label, via


def format_path(previous, target: str) -> str:
    if target in ROOTS:
        return "root field"
    steps = []
    node = target
    while previous.get(node):
        parent, field, via = previous[node]
        steps.append(f"{parent}.{field}" + (f" ({via})" if via else ""))
        node = parent
    if not steps:
        return "unreachable from a root"
    return " → ".join(reversed(steps)) + f" → {target}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("types", nargs="*", help="object types to list")
    parser.add_argument("--schema", type=Path, default=SCHEMA)
    args = parser.parse_args()

    if not args.schema.exists():
        print(
            f"{args.schema} is missing: run `pnpm run codegen` from the repository root.",
            file=sys.stderr,
        )
        return 2

    graph = Graph(args.schema.read_text())
    previous = graph.shortest_paths()

    if not args.types:
        rows = []
        for name in graph.fields:
            if name in ROOTS or graph.is_wrapper(name):
                continue
            edges = {(p, f) for p, f, _ in graph.folded_in_edges(name)}
            rows.append((len(edges), name))
        rows.sort(key=lambda row: (-row[0], row[1]))
        for count, name in rows:
            print(f"{count:4}  {name:36}  {format_path(previous, name)}")
        return 0

    status = 0
    for name in args.types:
        if name not in graph.fields:
            print(f"{name}: no such object or interface type", file=sys.stderr)
            status = 1
            continue
        edges = sorted(set(graph.folded_in_edges(name)))
        print(f"{name}: handed out by {len(edges)} fields")
        for parent, label, via in edges:
            shown = f"{parent}.{label}" + (f" ({via})" if via else "")
            print(f"  {shown:56}  {format_path(previous, parent)}")
        print()
    return status


if __name__ == "__main__":
    sys.exit(main())
