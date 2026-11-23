import { Plugin, Notice } from "obsidian";
import { EonicNoteCreator } from "./note-creator";
import { t } from "./i18n";
import { EonicColorEditorModal } from "./modals/color-editor";
import { TFile } from "obsidian";

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
          new EonicColorEditorModal(this.app, file).open();
        }

        return true;
      },
    });

    this.addSettingTab(new EonicNotesSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
