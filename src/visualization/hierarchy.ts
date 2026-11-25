import type { EonicNote, EonicNode, EonicSortOrder } from "./types";

export function buildHierarchy(
  notes: EonicNote[],
  order: EonicSortOrder = "asc",
): EonicNode[] {
  const roots: EonicNode[] = [];

  for (const note of notes) {
    const path = [...note.ancestors, note.title];

    let siblings = roots;

    for (let level = 0; level < path.length; level++) {
      const title = path[level]!;

      let node = siblings.find((entry) => entry.title === title);

      if (!node) {
        node = {
          title,
          level,
          children: [],
        };

        siblings.push(node);
      }

      if (level === path.length - 1) {
        node.note = note;
      }

      siblings = node.children;
    }
  }

  sortHierarchy(roots, order);

  return roots;
}

function sortHierarchy(nodes: EonicNode[], order: EonicSortOrder): void {
  const direction = order === "desc" ? -1 : 1;

  nodes.sort((a, b) => {
    // Keep placeholder nodes after actual notes,
    // regardless of the sorting direction.
    if (!a.note && b.note) return 1;
    if (a.note && !b.note) return -1;

    const orderA = a.note?.order ?? 0;
    const orderB = b.note?.order ?? 0;

    if (orderA !== orderB) {
      return (orderA - orderB) * direction;
    }

    // Alphabetical fallback for equal order values.
    return a.title.localeCompare(b.title) * direction;
  });

  // Apply the same sorting direction recursively.
  for (const node of nodes) {
    sortHierarchy(node.children, order);
  }
}

export function countRows(node: EonicNode): number {
  if (node.children.length === 0) {
    return 1;
  }

  return node.children.reduce((sum, child) => sum + countRows(child), 0);
}

export function getLeafNodes(nodes: EonicNode[]): EonicNode[] {
  return nodes.flatMap((node) =>
    node.children.length === 0 ? [node] : getLeafNodes(node.children),
  );
}
