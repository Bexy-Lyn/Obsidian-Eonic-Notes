import { App, MarkdownRenderChild, parseYaml, debounce } from "obsidian";

import type { EonicNotesSettings } from "../settings";
import type { EonicBlockOptions } from "./types";

import { collectEonicNotes } from "./note-collector";
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

    return {
      view: data.view ?? "table",
      tag: data.tag,
      order: data.order ?? "asc",
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

    if (!settings.hierarchy.some((key) => key.trim())) {
      this.showMessage(t("visualization.emptyHierarchy"));

      return;
    }

    const notes = collectEonicNotes(this.app, settings, options.tag);

    if (notes.length === 0) {
      this.showMessage(t("visualization.noNotes"));

      return;
    }

    const hierarchy = buildHierarchy(notes, options.order);

    switch (options.view) {
      case "table":
        this.cleanupView = renderTable(
          this.app,
          this.containerEl,
          hierarchy,
          settings,
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
