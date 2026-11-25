import type { App } from "obsidian";

import type { EonicNotesSettings } from "../../settings";
import type { EonicNode } from "../types";

import { countRows, getLeafNodes } from "../hierarchy";
import { getContrastColor, withOpacity } from "../../utils/colors";
import { observeAdaptiveLabels } from "../adaptive-labels";

const MIN_ROW_HEIGHT = 28;
const CONTINUATION_OPACITY = 0.3;

export function renderTable(
  app: App,
  container: HTMLElement,
  roots: EonicNode[],
  settings: EonicNotesSettings,
): () => void {
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

  const narrowColumnCount = Math.max(0, hierarchy.length - 2);

  const wideColumnCount = hierarchy.length - narrowColumnCount;

  const minTableWidth =
    narrowColumnCount * 48 +
    wideColumnCount * 110 +
    optionalProperties.length * 160;

  table.style.minWidth = `${minTableWidth}px`;

  // Define relative column widths.
  const colgroup = table.createEl("colgroup");

  for (let level = 0; level < hierarchy.length; level++) {
    const column = colgroup.createEl("col");

    if (level < hierarchy.length - 2) {
      column.addClass("eonic-notes-narrow-column");
    } else {
      column.addClass("eonic-notes-wide-column");
    }
  }

  for (let i = 0; i < optionalProperties.length; i++) {
    colgroup.createEl("col", {
      cls: "eonic-notes-property-column",
    });
  }

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

    const hasChildren = node.children.length > 0;

    const cell = row.createEl("td", {
      cls: "eonic-notes-hierarchy-cell",
    });

    cell.rowSpan = countRows(node);
    cell.colSpan = 1;

    if (hasChildren) {
      cell.addClass("eonic-notes-parent-cell");
    } else {
      cell.addClass("eonic-notes-terminal-cell");
    }

    // All higher hierarchy levels can use vertical labels,
    // even when they have no children.
    if (node.level < hierarchy.length - 2) {
      cell.addClass("eonic-notes-adaptive-cell");
    }

    const content = cell.createDiv({
      cls: "eonic-notes-cell-content",
    });

    const label = content.createDiv({
      cls: "eonic-notes-cell-label",
    });

    if (node.note) {
      const note = node.note;

      cell.style.backgroundColor = note.color;
      cell.style.color = getContrastColor(note.color);

      const link = label.createEl("a", {
        text: node.title,
        cls: "eonic-notes-table-link",
      });

      link.setAttribute("href", note.file.path);

      link.addEventListener("click", (event) => {
        event.preventDefault();

        const newTab = event.ctrlKey || event.metaKey;

        void app.workspace.getLeaf(newTab ? "tab" : false).openFile(note.file);
      });

      // Optional subtitle.
      if (note.description) {
        label.createDiv({
          text: note.description,
          cls: "eonic-notes-cell-description",
        });
      }
    } else {
      label.setText(node.title);
      cell.addClass("eonic-notes-placeholder-cell");
    }

    if (hasChildren) {
      for (const child of node.children) {
        renderNode(child);
      }
    } else {
      const color = node.note?.color ?? "#80CFE8";

      const continuationColor = withOpacity(color, CONTINUATION_OPACITY);

      // Fill unused hierarchy columns.
      const remainingColumns = hierarchy.length - node.level - 1;

      if (remainingColumns > 0) {
        const continuation = row.createEl("td", {
          cls: "eonic-notes-continuation-cell",
        });

        continuation.colSpan = remainingColumns;
        continuation.style.backgroundColor = continuationColor;
      }

      // Optional properties inherit the row's color.
      for (const property of optionalProperties) {
        const propertyCell = row.createEl("td", {
          text: node.note?.properties[property] ?? "",
          cls: "eonic-notes-property-cell",
        });

        propertyCell.style.backgroundColor = continuationColor;
      }

      rowIndex++;
    }
  }

  for (const root of roots) {
    renderNode(root);
  }

  return observeAdaptiveLabels(table);
}
