import { moment } from "obsidian";

import type { EonicNode, EonicTimelineOptions } from "./types";

export interface TimelineInterval {
  start: number;
  end: number;
}

export function calculateTimeline(
  leaves: EonicNode[],
  start: number = 0,
): TimelineInterval[] {
  let current = start;

  return leaves.map((node) => {
    const duration = node.note?.duration ?? 0;

    const interval: TimelineInterval = {
      start: current,
      end: current + duration,
    };

    current = interval.end;

    return interval;
  });
}

export function resolveTimelineColumn(
  options: EonicTimelineOptions,
  existingColumnCount: number,
): number {
  const column = options.column;

  if (
    !Number.isInteger(column) ||
    column < 1 ||
    column > existingColumnCount + 1
  ) {
    return 0;
  }

  // Convert to a zero-based column index.
  return column - 1;
}

export function formatTimelineValue(value: number): string {
  return new Intl.NumberFormat(moment.locale(), {
    maximumFractionDigits: 10,
    useGrouping: false,
  }).format(value);
}

export function createTimelineCell(
  interval: TimelineInterval,
  isLast: boolean,
  showStart: boolean,
): HTMLTableCellElement {
  const cell = createEl("td");

  cell.addClass("eonic-notes-timeline-cell");

  if (showStart) {
    cell.createDiv({
      cls: "eonic-notes-timeline-marker " + "eonic-notes-timeline-start",
      text: formatTimelineValue(interval.start),
    });
  }

  if (isLast) {
    cell.createDiv({
      cls: "eonic-notes-timeline-marker " + "eonic-notes-timeline-end",
      text: formatTimelineValue(interval.end),
    });
  }

  return cell;
}

export function insertTimelineCells(
  rows: HTMLTableRowElement[],
  intervals: TimelineInterval[],
  columnIndex: number,
): void {
  rows.forEach((row, index) => {
    const interval = intervals[index];

    if (!interval) return;

    const previous = intervals[index - 1];

    // Avoid repeating identical values caused
    // by consecutive zero-duration rows.
    const showStart = !previous || interval.start !== previous.start;

    const timelineCell = createTimelineCell(
      interval,
      index === rows.length - 1,
      showStart,
    );

    const cells = Array.from(row.cells);

    for (const cell of cells) {
      const logicalColumn = Number(cell.dataset.column);

      if (!Number.isInteger(logicalColumn)) {
        continue;
      }

      const endColumn = logicalColumn + cell.colSpan;

      // Insert before the next logical column.
      if (logicalColumn >= columnIndex) {
        row.insertBefore(timelineCell, cell);
        return;
      }

      // The timeline falls inside a merged
      // continuation cell. Split that cell.
      if (logicalColumn < columnIndex && endColumn > columnIndex) {
        const right = cell.cloneNode(true) as HTMLTableCellElement;

        cell.colSpan = columnIndex - logicalColumn;

        right.colSpan = endColumn - columnIndex;

        right.dataset.column = String(columnIndex);

        cell.after(timelineCell, right);

        return;
      }
    }

    // Timeline is the final table column.
    row.appendChild(timelineCell);
  });
}
