import { App, MarkdownRenderChild, parseYaml, debounce } from "obsidian";

import type { EonicNotesSettings } from "../settings";
import type { EonicBlockOptions } from "./types";
import { collectRawEonicNotes, normalizeEonicNotes } from "./note-collector";

import { detectSchema } from "./schema-detector";
import { buildHierarchy } from "./hierarchy";
import { renderTable } from "./views/table-view";
import { t } from "../i18n";

export class EonicBlock extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private app: App,
    private source: string,
    private getSettings: () => EonicNotesSettings,
    private cleanupView?: () => void,
  ) {
    super(containerEl);
  }

  onload(): void {
    this.render();

    const refresh = debounce(() => this.render(), 200, true);

    this.registerEvent(this.app.metadataCache.on("changed", () => refresh()));

    this.registerEvent(this.app.vault.on("delete", () => refresh()));

    this.registerEvent(this.app.vault.on("rename", () => refresh()));

    this.registerEvent(this.app.metadataCache.on("resolved", () => refresh()));

    this.register(() => refresh.cancel());
  }

  onunload(): void {
    this.cleanupView?.();
    this.cleanupView = undefined;
  }

  private parseOptions(): EonicBlockOptions {
    const parsed = this.source.trim() ? parseYaml(this.source) : {};

    const data = parsed ?? {};

    if (typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid options");
    }

    if (data.view !== undefined && typeof data.view !== "string") {
      throw new Error("Invalid view");
    }

    if (data.tag !== undefined && typeof data.tag !== "string") {
      throw new Error("Invalid tag");
    }

    if (
      data.order !== undefined &&
      data.order !== "asc" &&
      data.order !== "desc"
    ) {
      throw new Error("Invalid order");
    }

    if (
      data.properties !== undefined &&
      (!Array.isArray(data.properties) ||
        !data.properties.every(
          (value: unknown) =>
            typeof value === "string" && value.trim().length > 0,
        ))
    ) {
      throw new Error("Invalid properties");
    }

    return {
      view: data.view ?? "table",
      tag: data.tag,
      order: data.order ?? "asc",

      properties: data.properties?.map((key: string) => key.trim()),
    };
  }

  private render(): void {
    this.cleanupView?.();
    this.cleanupView = undefined;

    this.containerEl.empty();

    let options: EonicBlockOptions;

    try {
      options = this.parseOptions();
    } catch {
      this.showMessage(t("visualization.invalidOptions"));

      return;
    }

    const settings = this.getSettings();

    // 1. Collect matching notes.
    const rawNotes = collectRawEonicNotes(this.app, settings.tag, options.tag);

    if (rawNotes.length === 0) {
      this.showMessage(t("visualization.noNotes"));

      return;
    }

    // 2. Discover this visualization's schema.
    const schema = detectSchema(
      rawNotes,
      settings.hierarchy,
      options.properties,
    );

    // 3. Normalize the notes.
    const notes = normalizeEonicNotes(rawNotes, schema);

    if (notes.length === 0) {
      this.showMessage(t("visualization.noNotes"));

      return;
    }

    // 4. Build and sort the hierarchy.
    const hierarchy = buildHierarchy(notes, options.order);

    // 5. Render the selected visualization.
    switch (options.view) {
      case "table":
        this.cleanupView = renderTable(
          this.app,
          this.containerEl,
          hierarchy,
          schema,
        );

        break;

      default:
        this.showMessage(`${t("visualization.unknownView")} (${options.view})`);
    }
  }

  private showMessage(message: string): void {
    this.containerEl.createDiv({
      cls: "eonic-notes-message",
      text: message,
    });
  }
}
