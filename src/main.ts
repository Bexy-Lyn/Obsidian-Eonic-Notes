import { Plugin, Notice, MarkdownView, TFile } from "obsidian";
import { EonicNoteCreator } from "./note-creator";
import { t } from "./i18n";
import { EonicColorEditorModal } from "./modals/color-editor";
import { EonicBlock } from "./visualization/eonic-block";

import {
  DEFAULT_SETTINGS,
  EonicNotesSettingTab,
  type EonicNotesSettings,
} from "./settings";

export default class EonicNotesPlugin extends Plugin {
  settings!: EonicNotesSettings;

  private isEonicNote(file: TFile): boolean {
    const configuredTag = this.settings.tag.trim().replace(/^#+/, "");

    if (!configuredTag) return false;

    const cache = this.app.metadataCache.getFileCache(file);

    if (!cache) return false;

    // Tags in the note body.
    const inlineTags =
      cache.tags?.map((entry) => entry.tag.replace(/^#+/, "")) ?? [];

    // Tags in YAML frontmatter.
    const frontmatterTags = cache.frontmatter?.tags;

    const yamlTags = Array.isArray(frontmatterTags)
      ? frontmatterTags
      : typeof frontmatterTags === "string"
        ? frontmatterTags.split(",")
        : [];

    const allTags = [
      ...inlineTags,
      ...yamlTags.map((tag: unknown) => String(tag)),
    ];

    return allTags.some(
      (tag) => tag.trim().replace(/^#+/, "") === configuredTag,
    );
  }

  private openColorEditor(file: TFile): void {
    if (!this.isEonicNote(file)) return;

    new EonicColorEditorModal(this.app, file).open();
  }

  private updateColorButtons(): void {
    const leaves = this.app.workspace.getLeavesOfType("markdown");

    for (const leaf of leaves) {
      if (!(leaf.view instanceof MarkdownView)) {
        continue;
      }

      const view = leaf.view;
      const file = view.file;

      // Find an existing button, if any.
      let button = view.contentEl.querySelector<HTMLButtonElement>(
        ".eonic-notes-header-color",
      );

      // Only show the button in editing mode
      // and for notes with the configured tag.
      if (!file || view.getMode() !== "source" || !this.isEonicNote(file)) {
        button?.remove();
        continue;
      }

      // Create the button once per editor.
      if (!button) {
        button = createEl("button");
        button.className = "eonic-notes-header-color";
        button.type = "button";

        const propertiesEl = view.contentEl.querySelector(
          ".metadata-container",
        );

        if (propertiesEl) {
          propertiesEl.insertAdjacentElement("afterend", button);
        } else {
          // Fallback if the properties section is hidden.
          view.contentEl.prepend(button);
        }
      }

      // Update the button for the current note.
      const currentFile = file;

      const frontmatter =
        this.app.metadataCache.getFileCache(file)?.frontmatter;

      const savedColor = frontmatter?.color;

      const color =
        typeof savedColor === "string" && /^#[0-9a-fA-F]{6}$/.test(savedColor)
          ? savedColor
          : "#80CFE8";

      button.style.backgroundColor = color;

      button.setAttribute("aria-label", t("colorEditor.command"));

      button.onclick = () => {
        this.openColorEditor(currentFile);
      };
    }
  }

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("file-plus-2", t("note.create"), async () => {
      try {
        const creator = new EonicNoteCreator(this.app, this.settings);

        const file = await creator.create();

        // Open the newly created note.
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);

        new Notice(t("note.created"));
      } catch (error) {
        console.error("Eonic Notes: Failed to create note", error);

        new Notice(t("note.creationFailed"));
      }
    });

    this.addCommand({
      id: "edit-eonic-note-color",
      name: t("colorEditor.command"),

      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();

        if (!file || !this.isEonicNote(file)) {
          return false;
        }

        if (!checking) {
          this.openColorEditor(file);
        }

        return true;
      },
    });

    this.addSettingTab(new EonicNotesSettingTab(this.app, this));

    // Initialize buttons once the workspace is ready.
    this.app.workspace.onLayoutReady(() => {
      this.updateColorButtons();
    });

    this.registerMarkdownCodeBlockProcessor("eonic", (source, el, ctx) => {
      ctx.addChild(new EonicBlock(el, this.app, source, () => this.settings));
    });

    // Update when the active note changes.
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () =>
        this.updateColorButtons(),
      ),
    );

    // Update when files are opened.
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.updateColorButtons()),
    );

    // Update when switching editor modes or layouts.
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.updateColorButtons()),
    );

    // Update after frontmatter changes.
    this.registerEvent(
      this.app.metadataCache.on("changed", () => this.updateColorButtons()),
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
