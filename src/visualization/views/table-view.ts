import type { App } from "obsidian";

import type { EonicNotesSettings } from "../../settings";
import type { EonicNode } from "../types";

import { countRows, getLeafNodes } from "../hierarchy";

import { getContrastColor } from "../../utils/colors";

const MIN_ROW_HEIGHT = 28;

export function renderTable(
  app: App,
  container: HTMLElement,
  roots: EonicNode[],
  settings: EonicNotesSettings,
): void {
  const hierarchy = settings.hierarchy.map((key) => key.trim()).filter(Boolean);

  const optionalProperties = settings.optionalProperties
    .map((key) => key.trim())
    .filter(Boolean);

  const wrapper = container.createDiv({
    cls: "eonic-notes-table-wrapper",
  });

  const table = wrapper.createEl("table", {
    cls: "eonic-notes-table",
  });

  // Table headings
  const thead = table.createEl("thead");
  const headerRow = thead.createEl("tr");

  for (const column of [...hierarchy, ...optionalProperties]) {
    headerRow.createEl("th", {
      text: column,
    });
  }

  const tbody = table.createEl("tbody");

  // Only terminal nodes create physical rows.
  const leaves = getLeafNodes(roots);

  const positiveDurations = leaves
    .map((node) => node.note?.duration ?? 0)
    .filter((duration) => duration > 0);

  const referenceDuration =
    positiveDurations.length > 0 ? Math.min(...positiveDurations) : 1;

  // Create all rows in advance.
  const rows = leaves.map((node) => {
    const row = tbody.createEl("tr");

    const duration = node.note?.duration ?? 0;

    if (duration > 0) {
      const height = MIN_ROW_HEIGHT * (duration / referenceDuration);

      row.style.height = `${height}px`;
    }

    return row;
  });

  let rowIndex = 0;

  function renderNode(node: EonicNode): void {
    const row = rows[rowIndex];

    if (!row) return;

    const cell = row.createEl("td", {
      cls: "eonic-notes-hierarchy-cell",
    });

    const hasChildren = node.children.length > 0;

    cell.rowSpan = countRows(node);

    // Merge unused hierarchy columns when
    // this branch ends before the final level.
    cell.colSpan = hasChildren ? 1 : hierarchy.length - node.level;

    if (node.note) {
      const note = node.note;

      cell.style.backgroundColor = note.color;
      cell.style.color = getContrastColor(note.color);

      const link = cell.createEl("a", {
        text: node.title,
        cls: "eonic-notes-table-link",
      });

      link.setAttribute("href", note.file.path);

      link.addEventListener("click", (event) => {
        event.preventDefault();

        const newTab = event.ctrlKey || event.metaKey;

        void app.workspace.getLeaf(newTab ? "tab" : false).openFile(note.file);
      });
    } else {
      cell.setText(node.title);
      cell.addClass("eonic-notes-placeholder-cell");
    }

    if (hasChildren) {
      for (const child of node.children) {
        renderNode(child);
      }
    } else {
      // Optional properties belong to the
      // terminal note represented by this row.
      for (const property of optionalProperties) {
        row.createEl("td", {
          text: node.note?.properties[property] ?? "",
          cls: "eonic-notes-property-cell",
        });
      }

      rowIndex++;
    }
  }

  for (const root of roots) {
    renderNode(root);
  }
}
