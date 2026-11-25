const HORIZONTAL_PADDING_X = 8;
const VERTICAL_PADDING_X = 2;
const CELL_PADDING_Y = 4;

const MIN_VERTICAL_WIDTH = 28;
const MIN_HORIZONTAL_WIDTH = 80;
const MIN_PROPERTY_WIDTH = 160;

interface LabelMeasurement {
  cell: HTMLTableCellElement;
  width: number;
  height: number;
}

interface ColumnLayout {
  column: HTMLTableColElement;
  labels: LabelMeasurement[];
  horizontalWidth: number;
  verticalWidth: number;
  vertical: boolean;
}

function measureElement(element: HTMLElement): {
  width: number;
  height: number;
} {
  const measurement = element.cloneNode(true) as HTMLElement;

  measurement.addClass("eonic-notes-label-measurement");

  element.parentElement?.appendChild(measurement);

  const rect = measurement.getBoundingClientRect();

  measurement.remove();

  return {
    width: Math.ceil(rect.width),
    height: Math.ceil(rect.height),
  };
}

function fitsVertically(label: LabelMeasurement): boolean {
  return label.cell.clientHeight >= label.width + CELL_PADDING_Y * 2;
}

export function observeAdaptiveLabels(
  table: HTMLTableElement,
  wrapper: HTMLElement,
): () => void {
  const columns = Array.from(
    table.querySelectorAll<HTMLTableColElement>(
      "col.eonic-notes-hierarchy-column",
    ),
  );

  const propertyColumns = Array.from(
    table.querySelectorAll<HTMLTableColElement>(
      "col.eonic-notes-property-column",
    ),
  );

  const headers = Array.from(
    table.querySelectorAll<HTMLTableCellElement>("thead th"),
  );

  const cells = Array.from(
    table.querySelectorAll<HTMLTableCellElement>(
      "td.eonic-notes-hierarchy-cell",
    ),
  );

  function updateLayout(): void {
    if (!table.isConnected || wrapper.clientWidth === 0) {
      return;
    }

    // 1. Reset the previous orientation.
    for (const cell of cells) {
      cell.removeClass("eonic-notes-vertical-cell");
    }

    // 2. Measure each hierarchy column.
    const layouts: ColumnLayout[] = columns.map((column, index) => {
      const level = column.dataset.level;

      const columnCells = cells.filter((cell) => cell.dataset.level === level);

      const labels: LabelMeasurement[] = [];

      for (const cell of columnCells) {
        const label = cell.querySelector<HTMLElement>(
          ".eonic-notes-cell-label",
        );

        if (!label) continue;

        labels.push({
          cell,
          ...measureElement(label),
        });
      }

      const header = headers[index];

      const headerWidth = header ? measureElement(header).width + 8 : 0;

      const maxLabelWidth = Math.max(0, ...labels.map((label) => label.width));

      const maxLabelHeight = Math.max(
        0,
        ...labels.map((label) => label.height),
      );

      const horizontalWidth = Math.max(
        MIN_HORIZONTAL_WIDTH,
        headerWidth,
        maxLabelWidth + HORIZONTAL_PADDING_X * 2,
      );

      const verticalWidth = Math.max(
        MIN_VERTICAL_WIDTH,
        headerWidth,
        maxLabelHeight + VERTICAL_PADDING_X * 2,
      );

      return {
        column,
        labels,
        horizontalWidth,
        verticalWidth,
        vertical: false,
      };
    });

    // Keep secondary columns flexible, but ensure
    // their headings have enough space.
    const propertyWidths = propertyColumns.map((_, index) => {
      const header = headers[columns.length + index];

      return Math.max(
        MIN_PROPERTY_WIDTH,
        header ? measureElement(header).width + 8 : 0,
      );
    });

    function applyLayout(): void {
      let minTableWidth = 0;

      for (const layout of layouts) {
        const width = layout.vertical
          ? layout.verticalWidth
          : layout.horizontalWidth;

        layout.column.style.width = `${width}px`;

        minTableWidth += width;

        for (const label of layout.labels) {
          label.cell.classList.toggle(
            "eonic-notes-vertical-cell",
            layout.vertical,
          );
        }
      }

      propertyColumns.forEach((column, index) => {
        const width = propertyWidths[index];

        column.style.width = `${width}px`;

        minTableWidth += width!;
      });

      table.style.minWidth = `${minTableWidth}px`;

      // Distribute remaining space exclusively
      // among secondary property columns.
      const availableWidth = Math.max(minTableWidth, wrapper.clientWidth);

      if (propertyColumns.length > 0) {
        const extraWidth =
          (availableWidth - minTableWidth) / propertyColumns.length;

        propertyColumns.forEach((column, index) => {
          column.style.width = `${propertyWidths[index]! + extraWidth}px`;
        });

        table.style.width = `${availableWidth}px`;
      } else {
        table.style.width = `${minTableWidth}px`;
      }
    }

    // 3. Establish the horizontal baseline.
    applyLayout();

    // 4. Rotate only complete columns.
    for (const layout of layouts) {
      layout.vertical =
        layout.labels.length > 0 && layout.labels.every(fitsVertically);
    }

    applyLayout();

    // 5. Verify the resulting layout.
    // If a rotated label no longer fits, revert
    // its entire column to horizontal orientation.
    let changed: boolean;

    do {
      changed = false;

      for (const layout of layouts) {
        if (layout.vertical && !layout.labels.every(fitsVertically)) {
          layout.vertical = false;
          changed = true;
        }
      }

      if (changed) {
        applyLayout();
      }
    } while (changed);
  }

  let frame: number | null = null;
  let previousWidth = -1;

  function scheduleUpdate(): void {
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }

    frame = window.requestAnimationFrame(() => {
      frame = null;
      updateLayout();
    });
  }

  const observer = new ResizeObserver(() => {
    const width = wrapper.clientWidth;

    if (width === previousWidth) return;

    previousWidth = width;

    scheduleUpdate();
  });

  observer.observe(wrapper);

  scheduleUpdate();

  return () => {
    observer.disconnect();

    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
  };
}
