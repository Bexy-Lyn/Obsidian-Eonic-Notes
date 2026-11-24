import type { EonicNote, EonicNode } from "./types";

export function buildHierarchy(notes: EonicNote[]): EonicNode[] {
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

  sortHierarchy(roots);

  return roots;
}

function sortHierarchy(nodes: EonicNode[]): void {
  nodes.sort((a, b) => {
    const orderA = a.note?.order ?? Infinity;
    const orderB = b.note?.order ?? Infinity;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.title.localeCompare(b.title);
  });

  for (const node of nodes) {
    sortHierarchy(node.children);
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
