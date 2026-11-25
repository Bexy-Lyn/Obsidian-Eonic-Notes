const LABEL_PADDING = 16;

export function observeAdaptiveLabels(table: HTMLTableElement): () => void {
  const cells = Array.from(
    table.querySelectorAll<HTMLTableCellElement>(".eonic-notes-adaptive-cell"),
  );

  function updateCell(cell: HTMLTableCellElement): void {
    const label = cell.querySelector<HTMLElement>(".eonic-notes-cell-label");

    if (!label) return;

    const measurement = label.cloneNode(true) as HTMLElement;

    measurement.addClass("eonic-notes-label-measurement");

    cell.appendChild(measurement);

    const rect = measurement.getBoundingClientRect();

    // Horizontal dimensions become vertical
    // dimensions when the label is rotated.
    const requiredHeight = rect.width + LABEL_PADDING;

    const requiredWidth = rect.height + LABEL_PADDING;

    measurement.remove();

    const shouldBeVertical =
      cell.clientHeight >= requiredHeight && cell.clientWidth >= requiredWidth;

    cell.classList.toggle("eonic-notes-vertical-cell", shouldBeVertical);
  }

  let frame: number | null = null;

  function scheduleUpdate(): void {
    if (frame !== null) {
      cancelAnimationFrame(frame);
    }

    frame = window.requestAnimationFrame(() => {
      frame = null;

      for (const cell of cells) {
        updateCell(cell);
      }
    });
  }

  const observer = new ResizeObserver(() => {
    scheduleUpdate();
  });

  observer.observe(table);

  for (const cell of cells) {
    observer.observe(cell);
  }

  scheduleUpdate();

  // Return a cleanup function.
  return () => {
    observer.disconnect();

    if (frame !== null) {
      cancelAnimationFrame(frame);
    }
  };
}
